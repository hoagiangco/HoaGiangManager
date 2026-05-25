'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import api from '@/lib/utils/api';
import { 
  WorkPlanItemVM, 
  DamageReportStatus, 
  DamageReportPriority, 
  DeviceVM, 
  Location,
  Staff
} from '@/types';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format, addDays, isToday, isTomorrow, isAfter, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import Loading from '@/components/Loading';
import SearchableSelect from '@/components/SearchableSelect';

export default function WorkPlanPage() {
  const { user, isAdmin } = useAuth();
  const [staff, setStaff] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(addDays(new Date(), 1));
  const isFutureDate = isAfter(startOfDay(selectedDate), startOfDay(new Date()));
  const [planItems, setPlanItems] = useState<WorkPlanItemVM[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [devices, setDevices] = useState<DeviceVM[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [viewStaffId, setViewStaffId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'pending' | 'new'>('pending');
  const [taskTab, setTaskTab] = useState<'general' | 'device'>('general');

  const [copyTaskModalData, setCopyTaskModalData] = useState<WorkPlanItemVM | null>(null);
  const [copyTargetDate, setCopyTargetDate] = useState<Date>(addDays(new Date(), 1));
  const [activeDates, setActiveDates] = useState<Date[]>([]);

  const [newTask, setNewTask] = useState({
    title: '',
    deviceId: undefined as number | undefined,
    damageLocation: '',
    damageContent: '',
    priority: DamageReportPriority.Normal,
    staffId: undefined as number | undefined,
  });

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const staffRes = await api.get(`/staff/me?userId=${user.id}`).catch(() => ({ data: { status: false } }));
      if (staffRes.data.status) {
        const staffData = staffRes.data.data;
        setStaff(staffData);
        let targetStaffId = viewStaffId;
        if (targetStaffId === undefined) {
          targetStaffId = staffData.id;
          setViewStaffId(targetStaffId);
        } else if (!isAdmin) {
          targetStaffId = staffData.id;
        }
        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        await Promise.allSettled([
          api.get(`/work-plans?date=${dateStr}&staffId=${targetStaffId}`).then(res => {
            if (res.data.status) setPlanItems(res.data.data);
          }),
          api.get(`/work-plans/pending?staffId=${isAdmin ? 0 : targetStaffId}`).then(res => {
            if (res.data.status) setPendingReports(res.data.data);
          }),
          api.get(`/work-plans/active-dates?startDate=${new Date(selectedDate).getFullYear() - 1}-01-01&endDate=${new Date(selectedDate).getFullYear() + 1}-12-31&staffId=${targetStaffId}`).then(res => {
            if (res.data.status) setActiveDates(res.data.data.map((d: string) => new Date(d)));
          })
        ]);
      }

      await Promise.allSettled([
        api.get('/devices?limit=1000').then(res => {
          if (res.data.status) setDevices(res.data.data);
        }),
        api.get('/locations').then(res => {
          if (res.data.status) setLocations(res.data.data);
        }),
        api.get('/staff?departmentId=0').then(res => {
          if (res.data.status) setAllStaff(res.data.data);
        })
      ]);
    } catch (error) {
      console.error('Lỗi tải dữ liệu work-plan:', error);
      toast.error('Có lỗi xảy ra khi tải một số dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate, viewStaffId, isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  // Set default staff for new task when staff info is loaded
  useEffect(() => {
    if (staff && !newTask.staffId) {
      setNewTask(prev => ({ ...prev, staffId: staff.id }));
    }
  }, [staff, newTask.staffId]);

  const handleAddPending = async (reportId: number, content: string, reportHandlerId?: number) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const targetStaffId = !isAdmin ? staff.id : (viewStaffId === undefined ? staff.id : viewStaffId);
      // Assign to the DamageReport Handler if available, else target viewed staff, else current staff
      const assignToStaffId = reportHandlerId || (targetStaffId !== 0 ? targetStaffId : staff.id);

      const res = await api.post('/work-plans', {
        planDate: dateStr, staffId: assignToStaffId, damageReportId: reportId,
        isNewTask: false, title: content.substring(0, 50), createdBy: user?.id
      });
      if (res.data.status) { toast.success('Đã thêm việc'); loadData(); }
    } catch (error) { toast.error('Lỗi khi thêm việc'); }
  };

  const handleCreateNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.damageContent.trim()) { toast.warning('Nhập nội dung'); return; }
    if (!newTask.staffId) { toast.warning('Vui lòng chọn người thực hiện'); return; }

    if (taskTab === 'device' && !newTask.deviceId) {
      toast.warning('Vui lòng chọn thiết bị');
      return;
    }

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      let finalTitle = newTask.title;
      if (taskTab === 'device') {
        const dev = devices.find(d => d.id === newTask.deviceId);
        finalTitle = dev ? dev.name : 'Báo cáo thiết bị';
      } else if (!finalTitle) {
        finalTitle = newTask.damageContent.substring(0, 50);
      }

      const res = await api.post('/work-plans', {
        planDate: dateStr, staffId: newTask.staffId, isNewTask: true,
        title: finalTitle,
        draftData: {
          deviceId: taskTab === 'device' ? newTask.deviceId : undefined, 
          damageLocation: newTask.damageLocation,
          damageContent: newTask.damageContent, priority: newTask.priority,
          reporterId: staff.id, reportingDepartmentId: staff.departmentId
        },
        createdBy: user?.id
      });
      if (res.data.status) {
        toast.success('Đã thêm việc mới'); setIsModalOpen(false);
        setNewTask({ title: '', deviceId: undefined, damageLocation: '', damageContent: '', priority: DamageReportPriority.Normal, staffId: staff.id });
        loadData();
      }
    } catch (error) { toast.error('Lỗi khi tạo việc'); }
  };

  const handleDeviceChange = (devId: number) => {
    const dev = devices.find(d => d.id === devId);
    setNewTask(prev => ({
      ...prev,
      deviceId: devId,
      damageLocation: dev?.locationName || prev.damageLocation
    }));
  };

  const handleImplement = async (itemId: number) => {
    try {
      const res = await api.post(`/work-plans/${itemId}/implement`, { staffId: staff.id, userId: user?.id });
      if (res.data.status) { toast.success('Đã xác nhận triển khai'); loadData(); }
    } catch (error: any) { toast.error('Lỗi: ' + (error.response?.data?.error || error.message)); }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Xóa mục này?')) return;
    try {
      const res = await api.delete(`/work-plans?id=${itemId}&staffId=${staff.id}&isAdmin=${isAdmin}`);
      if (res.data.status) { toast.success('Đã xóa'); loadData(); }
    } catch (error) { toast.error('Lỗi khi xóa'); }
  };

  const handleCopyTask = async () => {
    if (!copyTaskModalData) return;
    try {
      const dateStr = format(copyTargetDate, 'yyyy-MM-dd');
      const res = await api.post('/work-plans', {
        planDate: dateStr,
        staffId: copyTaskModalData.staffId,
        isNewTask: true,
        title: copyTaskModalData.title,
        draftData: copyTaskModalData.draftData,
        createdBy: user?.id
      });
      if (res.data.status) {
        toast.success(`Đã copy sang ngày ${format(copyTargetDate, 'dd/MM/yyyy')}`);
        setCopyTaskModalData(null);
        loadData();
      }
    } catch (error) { toast.error('Lỗi khi copy công việc'); }
  };

  const getDateLabel = () => {
    if (isToday(selectedDate)) return 'Hôm nay';
    if (isTomorrow(selectedDate)) return 'Ngày mai';
    return format(selectedDate, 'eeee, dd/MM', { locale: vi });
  };

  if (loading && !staff) return <Loading />;

  return (
    <div className="work-plan-container container-fluid p-3">
      {/* Header Section */}
      <div className="plan-header glass-card p-3 mb-3 d-flex flex-column flex-md-row justify-content-between gap-3">
        <div className="d-flex align-items-sm-center gap-3 w-100">
          <div className="date-badge-modern flex-shrink-0">
            <div className="db-month">{format(selectedDate, 'MMM', { locale: vi })}</div>
            <div className="db-day">{format(selectedDate, 'dd')}</div>
          </div>
          <div className="header-info min-w-0 flex-grow-1">
            <h3 className="m-0 fw-bold text-dark d-flex flex-wrap align-items-center gap-2 mb-2">
              {getDateLabel()}
              <span className="badge rounded-pill bg-primary-subtle text-primary fw-normal" style={{ fontSize: '0.7rem' }}>
                {planItems.length} việc
              </span>
            </h3>
            <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-2 mt-1">
              <div className="quick-nav d-flex gap-1 bg-light p-1 rounded-3 overflow-x-auto" style={{ maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
                <button 
                  className={`btn btn-xs px-2 px-sm-3 rounded-2 text-nowrap ${isToday(selectedDate) ? 'btn-white shadow-sm active' : 'btn-ghost'}`}
                  onClick={() => setSelectedDate(new Date())}
                >Hôm nay</button>
                <button 
                  className={`btn btn-xs px-2 px-sm-3 rounded-2 text-nowrap ${isTomorrow(selectedDate) ? 'btn-white shadow-sm active' : 'btn-ghost'}`}
                  onClick={() => setSelectedDate(addDays(new Date(), 1))}
                >Ngày mai</button>
                <div className="position-relative flex-shrink-0">
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date: Date) => setSelectedDate(date || new Date())}
                    dateFormat="dd/MM/yyyy"
                    highlightDates={activeDates}
                    portalId="root-portal"
                    customInput={
                      <button className="btn btn-xs px-2 px-sm-3 rounded-2 btn-ghost text-nowrap">
                        <i className="fas fa-calendar-alt me-1"></i>Chọn ngày
                      </button>
                    }
                  />
                </div>
              </div>
              <div className="text-muted small fw-medium d-none d-md-block text-nowrap">
                {format(selectedDate, 'dd/MM/yyyy')}
              </div>
            </div>
          </div>
        </div>
        <div className="header-actions d-flex flex-column flex-sm-row gap-2 align-items-stretch align-items-sm-center w-100 w-md-auto mt-2 mt-md-0 pt-2 pt-md-0">
          {isAdmin && (
            <div className="admin-filter d-flex align-items-center gap-2">
              <span className="small text-muted fw-bold text-uppercase text-nowrap" style={{ fontSize: '0.65rem' }}>Xem của:</span>
              <div className="flex-grow-1" style={{ minWidth: '160px' }}>
                <SearchableSelect 
                  options={allStaff.map(s => ({ id: s.id, name: s.name }))} 
                  value={viewStaffId === undefined ? 0 : viewStaffId} 
                  onChange={(val) => setViewStaffId(val)} 
                  placeholder="Tất cả nhân viên" 
                  className="form-select-sm border-0 bg-light shadow-none fw-bold text-primary w-100"
                />
              </div>
            </div>
          )}
          <button className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2" onClick={() => { setModalMode('new'); setIsModalOpen(true); }}>
            <i className="fas fa-plus"></i>
            <span>Thêm công việc</span>
          </button>
        </div>
      </div>

      <div className="row g-3">
        {/* Main List Section */}
        <div className="col-lg-8">
          <div className="tasks-section glass-card h-100">
            <div className="section-title p-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="m-0 text-uppercase fw-bold text-primary ls-1">Kế hoạch triển khai</h6>
              <div className="d-flex gap-2">
                <span className="badge bg-success-subtle text-success">{planItems.filter(i => i.isImplemented).length} Hoàn thành</span>
                <span className="badge bg-primary-subtle text-primary">{planItems.filter(i => !i.isImplemented).length} Đang chờ</span>
              </div>
            </div>
            <div className="tasks-list p-2">
              {planItems.length === 0 ? (
                <div className="text-center py-5">
                  <div className="empty-state-icon mb-3"><i className="fas fa-calendar-day"></i></div>
                  <p className="text-muted">Chưa có công việc nào được lên kế hoạch.</p>
                </div>
              ) : (
                <div className="task-items-wrapper">
                  {planItems.map((item, idx) => (
                    <div key={item.id} className={`task-card mb-2 ${item.isImplemented ? 'implemented' : ''}`}>
                      <div className="task-number">{idx + 1}</div>
                      <div className="task-content">
                        {/* Device / Location label */}
                        {!item.isNewTask && (item.maintenanceBatchId || item.deviceName || item.location) && (
                          <div className="task-location mb-1 d-flex align-items-center flex-wrap gap-1">
                            {item.maintenanceBatchId ? (
                              <>
                                <span className="mini-badge bg-primary">Bảo trì</span>
                                <span className="text-muted" style={{ fontSize: '0.72rem' }}>{item.maintenanceTitle || item.maintenanceBatchId}</span>
                              </>
                            ) : (
                              <>
                                <i className="fas fa-map-marker-alt text-danger" style={{ fontSize: '0.65rem' }}></i>
                                <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                  {item.deviceName
                                    ? `${item.deviceName}${item.location ? ` — ${item.location}` : ''}`
                                    : item.location}
                                </span>
                              </>
                            )}
                            <span className="mini-badge bg-warning">Tồn</span>
                          </div>
                        )}
                        {item.isNewTask && (
                          <div className="task-location mb-1">
                            <span className="mini-badge bg-info">Mới</span>
                            {item.draftData?.damageLocation && (
                              <span className="text-muted ms-2" style={{ fontSize: '0.72rem' }}>
                                <i className="fas fa-map-marker-alt me-1"></i>{item.draftData.damageLocation}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Full content */}
                        <div className="task-body-content">
                          {item.isNewTask
                            ? (item.draftData?.damageContent || item.title)
                            : (item.damageContent || item.title)}
                        </div>

                        <div className="mt-1 d-flex align-items-center gap-2 flex-wrap">
                          <span className="badge bg-light text-dark fw-normal border" style={{ fontSize: '0.7rem' }}>
                            <i className="fas fa-user-cog me-1 text-primary"></i>
                            Người xử lý: <span className="fw-bold ms-1">{item.reportHandlerName || item.staffName || 'Chưa phân công'}</span>
                          </span>
                          {item.damageReportId && (
                            <span className="badge bg-light text-secondary fw-normal border" style={{ fontSize: '0.7rem' }}>
                              <i className="fas fa-info-circle me-1"></i>
                              #{item.damageReportId} · {item.reportStatusName}
                            </span>
                          )}
                        </div>
                      </div>
                        <div className="task-actions">
                          {item.isNewTask && !item.isImplemented && (
                            <button className="btn btn-icon btn-copy" onClick={() => setCopyTaskModalData(item)} title="Copy sang ngày khác">
                              <i className="fas fa-copy"></i>
                            </button>
                          )}
                          {!item.isImplemented ? (
                            !isFutureDate && (
                              <button className="btn btn-icon btn-confirm" onClick={() => handleImplement(item.id)} title="Xác nhận">
                                <i className="fas fa-check"></i>
                              </button>
                            )
                          ) : (
                            <span className="implemented-check"><i className="fas fa-check-double"></i></span>
                          )}
                          <button className="btn btn-icon btn-delete" onClick={() => handleDeleteItem(item.id)} title="Xóa">
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Suggestion Section */}
        <div className="col-lg-4">
          <div className="suggestion-section glass-card h-100">
            <div className="section-title p-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="m-0 text-uppercase fw-bold text-secondary ls-1">Gợi ý việc tồn đọng</h6>
              <span className="badge bg-secondary-subtle text-secondary">{pendingReports.length} việc</span>
            </div>
            <div className="suggestion-list p-2">
              {pendingReports.length === 0 ? (
                <div className="text-center py-4 text-muted small">Không có việc tồn đọng.</div>
              ) : (
                pendingReports.map(report => {
                  const isInPlan = planItems.some(p => p.damageReportId === report.id);
                  return (
                    <div key={report.id} className={`suggest-item p-2 mb-2 ${isInPlan ? 'in-plan' : ''}`}>
                      <div className="suggest-info overflow-hidden">
                        <div className="fw-bold small text-truncate d-flex align-items-center gap-1">
                          <span>#{report.id} -</span>
                          {report.maintenanceBatchId ? (
                            <>
                              <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-1 py-0">Bảo trì</span>
                              <span className="text-truncate" title={report.maintenanceBatchId}>{report.maintenanceTitle || report.maintenanceBatchId}</span>
                            </>
                          ) : (
                            <span className="text-truncate">{report.deviceName || report.location || 'Công việc chung'}</span>
                          )}
                        </div>
                        <div className="text-muted x-small text-truncate-2 mt-1">{report.content}</div>
                      </div>
                      <button 
                        className={`btn btn-sm rounded-circle ${isInPlan ? 'btn-light disabled' : 'btn-soft-primary'}`}
                        onClick={() => !isInPlan && handleAddPending(report.id, report.content, report.handlerId)}
                      >
                        <i className={`fas ${isInPlan ? 'fa-check' : 'fa-plus'}`}></i>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Copy Task Modal */}
      {copyTaskModalData && (
        <div className="custom-modal-overlay">
          <div className="custom-modal glass-card p-0 shadow-lg border-0" style={{ maxWidth: '400px' }}>
            <div className="modal-header-premium p-3 border-bottom bg-white d-flex justify-content-between align-items-center" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <h5 className="m-0 fw-bold text-dark">Copy công việc</h5>
              <button className="btn-close-custom" onClick={() => setCopyTaskModalData(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body p-4 bg-white text-center" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
              <p className="mb-3 text-muted small">Chọn ngày để copy công việc này:</p>
              <div className="d-flex justify-content-center mb-4">
                <DatePicker
                  selected={copyTargetDate}
                  onChange={(date: Date) => setCopyTargetDate(date || new Date())}
                  dateFormat="dd/MM/yyyy"
                  highlightDates={activeDates}
                  className="form-control form-control-premium text-center fw-bold"
                  minDate={new Date()}
                  portalId="root-portal"
                />
              </div>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-light px-4" onClick={() => setCopyTaskModalData(null)}>Hủy</button>
                <button className="btn btn-primary px-4 d-flex align-items-center gap-2" onClick={handleCopyTask}>
                  <i className="fas fa-copy"></i>
                  <span>Copy ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Modal */}
      {isModalOpen && (
        <div className="custom-modal-overlay">
          <div className="custom-modal glass-card p-0 overflow-hidden shadow-lg border-0" style={{ maxWidth: '650px' }}>
            <div className="modal-header-premium p-4 border-bottom bg-white d-flex justify-content-between align-items-center">
              <div>
                <h4 className="m-0 fw-bold text-dark">Lên kế hoạch mới</h4>
                <p className="text-muted small m-0 mt-1">Sắp xếp công việc cho ngày {format(selectedDate, 'dd/MM/yyyy')}</p>
              </div>
              <button className="btn-close-custom" onClick={() => setIsModalOpen(false)}><i className="fas fa-times"></i></button>
            </div>

            <div className="modal-tabs-container bg-light p-2 d-flex gap-2">
              <button 
                className={`flex-fill btn rounded-3 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 transition-all ${taskTab === 'general' ? 'btn-white shadow-sm text-primary' : 'btn-link text-muted text-decoration-none'}`}
                onClick={() => setTaskTab('general')}
              >
                <i className="fas fa-tasks"></i>
                Công việc chung
              </button>
              <button 
                className={`flex-fill btn rounded-3 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 transition-all ${taskTab === 'device' ? 'btn-white shadow-sm text-primary' : 'btn-link text-muted text-decoration-none'}`}
                onClick={() => setTaskTab('device')}
              >
                <i className="fas fa-tools"></i>
                Việc cho thiết bị
              </button>
            </div>

            <div className="modal-body p-4 bg-white">
              <form onSubmit={handleCreateNewTask}>
                <div className="row g-3">
                  {/* Title only for General Task */}
                  {taskTab === 'general' && (
                    <div className="col-12 animate-fade-in">
                      <label className="form-label small fw-bold text-uppercase ls-1">Tiêu đề công việc <span className="text-danger">*</span></label>
                      <input type="text" className="form-control form-control-premium" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="Vd: Kiểm tra đèn hành lang, Vệ sinh khu vực..." required={taskTab === 'general'} />
                    </div>
                  )}

                  {taskTab === 'general' && (
                    <div className="col-12 animate-fade-in">
                      <label className="form-label small fw-bold text-uppercase ls-1">Vị trí / Khu vực <span className="text-muted fw-normal">(tuỳ chọn)</span></label>
                      <input type="text" className="form-control form-control-premium" value={newTask.damageLocation} onChange={e => setNewTask({...newTask, damageLocation: e.target.value})} placeholder="Vd: Vườn rau, Nhà bếp, Sân vườn..." />
                    </div>
                  )}

                  <div className="col-md-12">
                    <label className="form-label small fw-bold text-uppercase ls-1">Người thực hiện</label>
                    <SearchableSelect 
                      options={isAdmin ? allStaff.map(s => ({ id: s.id, name: s.name })) : (staff ? [{ id: staff.id, name: staff.name }] : [])} 
                      value={newTask.staffId || 0} 
                      onChange={(val) => setNewTask({...newTask, staffId: val})} 
                      placeholder="Chọn nhân viên..." 
                    />
                  </div>

                  {/* Device Specific Fields */}
                  {taskTab === 'device' ? (
                    <div className="col-12 animate-fade-in">
                      <label className="form-label small fw-bold text-uppercase ls-1">Chọn thiết bị <span className="text-danger">*</span></label>
                      <SearchableSelect 
                        options={devices.map(d => ({ id: d.id, name: `${d.name}${d.serial ? ` (${d.serial})` : ''}` }))} 
                        value={newTask.deviceId || 0} 
                        onChange={handleDeviceChange} 
                        placeholder="Tìm thiết bị..." 
                      />
                    </div>
                  ) : null}

                  <div className="col-12">
                    <label className="form-label small fw-bold text-uppercase ls-1">Nội dung chi tiết <span className="text-danger">*</span></label>
                    <textarea className="form-control form-control-premium" rows={3} value={newTask.damageContent} onChange={e => setNewTask({...newTask, damageContent: e.target.value})} placeholder="Mô tả cụ thể những gì cần làm..." required></textarea>
                  </div>
                </div>

                <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center mt-4 pt-3 border-top gap-3">
                  <div className="priority-modern d-flex align-items-center justify-content-between justify-content-md-start gap-2">
                    <span className="small text-muted fw-bold text-nowrap">Ưu tiên:</span>
                    <div className="btn-group btn-group-sm">
                      {[
                        {v: DamageReportPriority.Low, l: 'Thấp', c: 'success'},
                        {v: DamageReportPriority.Normal, l: 'Thường', c: 'primary'},
                        {v: DamageReportPriority.High, l: 'Cao', c: 'warning'},
                        {v: DamageReportPriority.Urgent, l: 'Gấp', c: 'danger'}
                      ].map(p => (
                        <button 
                          key={p.v}
                          type="button" 
                          className={`btn btn-outline-${p.c} px-2 px-sm-3 ${newTask.priority === p.v ? 'active shadow-sm' : ''}`}
                          onClick={() => setNewTask({...newTask, priority: p.v})}
                        >{p.l}</button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg px-4 rounded-3 shadow fw-bold d-flex align-items-center justify-content-center gap-2">
                    <span>Lưu kế hoạch</span>
                    <i className="fas fa-arrow-right small"></i>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .work-plan-container { background: #f8f9fa; min-height: calc(100vh - 100px); font-family: 'Inter', sans-serif; }
        .glass-card { background: white; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
        .ls-1 { letter-spacing: 1px; font-size: 0.75rem; }
        
        /* Header Modern */
        .date-badge-modern { background: #0d6efd; color: white; width: 56px; height: 56px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(13, 110, 253, 0.3); }
        .db-month { font-size: 0.6rem; font-weight: 800; text-transform: uppercase; opacity: 0.9; line-height: 1; }
        .db-day { font-size: 1.5rem; font-weight: 800; line-height: 1.1; }
        
        .btn-xs { padding: 4px 8px; font-size: 0.75rem; font-weight: 600; }
        .btn-ghost { background: transparent; border: none; color: #6c757d; }
        .btn-ghost:hover { background: rgba(0,0,0,0.05); color: #212529; }
        .btn-white { background: white; border: none; color: #212529; }
        .btn-white.active { color: #0d6efd; }
        
        .datepicker-hidden-trigger { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .bg-primary-subtle { background-color: rgba(13, 110, 253, 0.1) !important; }
        
        /* Task Card */
        .task-card { display: flex; align-items: center; padding: 12px 16px; background: white; border-radius: 12px; border: 1px solid #f1f3f5; transition: all 0.2s ease; }
        .task-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: #e9ecef; }
        .task-card.implemented { opacity: 0.7; background: #f8f9fa; }
        .task-number { width: 28px; height: 28px; border-radius: 50%; background: #e9ecef; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: #495057; margin-right: 16px; }
        .task-content { flex: 1; min-width: 0; }
        .task-title { font-size: 0.95rem; font-weight: 600; color: #212529; }
        .task-location { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
        .task-body-content { font-size: 0.88rem; font-weight: 500; color: #212529; line-height: 1.5; word-break: break-word; }
        .task-meta { font-size: 0.75rem; margin-top: 2px; }
        .mini-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.6rem; font-weight: 700; color: white; text-transform: uppercase; }
        
        /* Actions */
        .task-actions { display: flex; align-items: center; gap: 8px; }
        .btn-icon { width: 32px; height: 32px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .btn-confirm { background: #e7f5ff; color: #0d6efd; }
        .btn-confirm:hover { background: #0d6efd; color: white; }
        .btn-delete { background: #fff5f5; color: #fa5252; }
        .btn-delete:hover { background: #fa5252; color: white; }
        .btn-copy { background: #e0f2fe; color: #0ea5e9; }
        .btn-copy:hover { background: #0ea5e9; color: white; }
        .implemented-check { color: #40c057; font-size: 1.1rem; margin-right: 8px; }

        /* DatePicker Highlights */
        :global(.react-datepicker-popper) {
          z-index: 1060 !important;
        }
        :global(.react-datepicker__day--highlighted) {
          font-weight: bold;
          position: relative;
        }
        :global(.react-datepicker__day--highlighted::after) {
          content: '';
          position: absolute;
          bottom: 3px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #ff9800;
        }
        :global(.react-datepicker__day--selected.react-datepicker__day--highlighted::after),
        :global(.react-datepicker__day--keyboard-selected.react-datepicker__day--highlighted::after) {
          background-color: #ffffff;
        }

        /* Suggest Items */
        .suggest-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; border-radius: 10px; border: 1px solid transparent; transition: all 0.2s; }
        .suggest-item:hover { background: #f1f3f5; }
        .suggest-item.in-plan { opacity: 0.5; }
        .btn-soft-primary { background: #e7f5ff; color: #0d6efd; border: none; }
        .btn-soft-primary:hover { background: #0d6efd; color: white; }
        .x-small { font-size: 0.75rem; }
        .text-truncate-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        /* Modal */
        .custom-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1050; backdrop-filter: blur(4px); }
        .custom-modal { width: 95%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; animation: modalSlideUp 0.3s ease-out; }
        .modal-header-premium, .modal-tabs-container { flex-shrink: 0; }
        .modal-body { overflow-y: auto; min-height: 0; }
        .form-control-modern { border-radius: 10px; border: 1px solid #dee2e6; padding: 10px 14px; font-size: 0.9rem; }
        .form-control-modern:focus { box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.1); border-color: #0d6efd; }
        .btn-close-custom { border: none; background: transparent; font-size: 1.2rem; color: #adb5bd; transition: color 0.2s; }
        .btn-close-custom:hover { color: #495057; }

        @keyframes modalSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .transition-all { transition: all 0.2s ease; }
        .form-control-premium { border-radius: 10px; border: 1px solid #e9ecef; padding: 12px 16px; font-size: 0.95rem; background: #fcfcfc; }
        .form-control-premium:focus { background: white; border-color: #0d6efd; box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.1); }
        .input-group-text { border-radius: 10px 0 0 10px; border: 1px solid #e9ecef; }
        .ls-1 { letter-spacing: 0.5px; }
        .btn-white { background: white; border: 1px solid rgba(0,0,0,0.05); }
        .btn-soft-primary { background: #e7f5ff; color: #0d6efd; }
      `}</style>
    </div>
  );
}
