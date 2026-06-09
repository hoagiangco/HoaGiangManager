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
  const [viewStaffId, setViewStaffId] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'pending' | 'new' | 'edit'>('pending');
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [taskTab, setTaskTab] = useState<'general' | 'device'>('general');
  const [scheduleMode, setScheduleMode] = useState<'archive' | 'date'>('archive');
  const [planApplyDate, setPlanApplyDate] = useState<Date>(addDays(new Date(), 1));

  const [moveTaskModalData, setMoveTaskModalData] = useState<WorkPlanItemVM | null>(null);
  const [moveTargetDate, setMoveTargetDate] = useState<Date>(addDays(new Date(), 1));
  const [activeDates, setActiveDates] = useState<Date[]>([]);

  // Overdue backlog drawer
  const [overdueDrawerOpen, setOverdueDrawerOpen] = useState(false);
  const [overdueItems, setOverdueItems] = useState<WorkPlanItemVM[]>([]);
  const [overdueLoading, setOverdueLoading] = useState(false);
  const [selectedOverdueIds, setSelectedOverdueIds] = useState<Set<number>>(new Set());
  const [bulkTargetDate, setBulkTargetDate] = useState<Date>(addDays(new Date(), 1));
  const [itemTargetDates, setItemTargetDates] = useState<Record<number, Date>>({});
  const [movingIds, setMovingIds] = useState<Set<number>>(new Set());

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
        if (!isAdmin) {
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

  const loadArchiveItems = useCallback(async () => {
    if (!user) return;
    setOverdueLoading(true);
    try {
      const staffRes = await api.get(`/staff/me?userId=${user.id}`).catch(() => ({ data: { status: false } }));
      if (!staffRes.data.status) return;
      const myStaff = staffRes.data.data;
      const targetStaffId = isAdmin ? 0 : myStaff.id;
      const res = await api.get(`/work-plans?archive=true&staffId=${targetStaffId}`);
      if (res.data.status) {
        setOverdueItems(res.data.data);
        const tomorrow = addDays(new Date(), 1);
        const initDates: Record<number, Date> = {};
        res.data.data.forEach((item: WorkPlanItemVM) => { initDates[item.id] = tomorrow; });
        setItemTargetDates(initDates);
      }
    } catch (e) {
      console.error('Lỗi tải kho kế hoạch:', e);
      toast.error('Lỗi khi tải kho kế hoạch');
    } finally {
      setOverdueLoading(false);
    }
  }, [user, isAdmin]);

  const handleMoveItem = async (item: WorkPlanItemVM, targetDate: Date) => {
    setMovingIds(prev => new Set(prev).add(item.id));
    try {
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      // 1. Create new item on target date
      const res = await api.post('/work-plans', {
        planDate: dateStr,
        staffId: item.staffId,
        damageReportId: item.isNewTask ? undefined : item.damageReportId,
        isNewTask: item.isNewTask,
        title: item.title,
        draftData: item.isNewTask ? (item.draftData || {
          damageLocation: item.location || '',
          damageContent: item.damageContent || item.title,
        }) : null,
        createdBy: user?.id
      });
      if (res.data.status) {
        // 2. Delete old item
        await api.delete(`/work-plans?id=${item.id}&staffId=${item.staffId}&isAdmin=${isAdmin}`);
        toast.success(`Đã chuyển sang ${format(targetDate, 'dd/MM/yyyy')}`);
        setOverdueItems(prev => prev.filter(i => i.id !== item.id));
        setSelectedOverdueIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
        // Refresh plan if moved to selected date
        if (format(targetDate, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) loadData();
      }
    } catch (e) {
      toast.error('Lỗi khi chuyển công việc');
    } finally {
      setMovingIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    }
  };

  const handleMoveSelected = async () => {
    if (selectedOverdueIds.size === 0) { toast.warning('Chưa chọn công việc nào'); return; }
    const itemsToMove = overdueItems.filter(i => selectedOverdueIds.has(i.id));
    for (const item of itemsToMove) {
      await handleMoveItem(item, bulkTargetDate);
    }
  };

  const handleDeleteOverdueItem = async (item: WorkPlanItemVM) => {
    if (!window.confirm('Bạn có chắc muốn xoá kế hoạch này?')) return;
    setMovingIds(prev => new Set(prev).add(item.id));
    try {
      const res = await api.delete(`/work-plans?id=${item.id}&staffId=${item.staffId}&isAdmin=${isAdmin}`);
      if (res.data.status) {
        toast.success('Đã xoá kế hoạch');
        setOverdueItems(prev => prev.filter(i => i.id !== item.id));
        setSelectedOverdueIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
      }
    } catch (e) {
      toast.error('Lỗi khi xoá kế hoạch');
    } finally {
      setMovingIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    }
  };

  const handleDeleteSelectedOverdue = async () => {
    if (selectedOverdueIds.size === 0) { toast.warning('Chưa chọn công việc nào'); return; }
    if (!window.confirm(`Bạn có chắc muốn xoá ${selectedOverdueIds.size} kế hoạch đã chọn?`)) return;
    const itemsToDelete = overdueItems.filter(i => selectedOverdueIds.has(i.id));
    for (const item of itemsToDelete) {
      try {
        setMovingIds(prev => new Set(prev).add(item.id));
        const res = await api.delete(`/work-plans?id=${item.id}&staffId=${item.staffId}&isAdmin=${isAdmin}`);
        if (res.data.status) {
          setOverdueItems(prev => prev.filter(i => i.id !== item.id));
          setSelectedOverdueIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
        }
      } catch (e) {
        toast.error(`Lỗi khi xoá kế hoạch ID ${item.id}`);
      } finally {
        setMovingIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
      }
    }
    toast.success('Đã xoá các kế hoạch được chọn');
  };

  // Removed auto-assignment of staffId for new task

  const handleAddPending = async (reportId: number, content: string, reportHandlerId?: number) => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const targetStaffId = !isAdmin ? staff.id : (viewStaffId === undefined ? staff.id : viewStaffId);
      // Assign to the DamageReport Handler if available, else target viewed staff, else current staff
      const assignToStaffId = reportHandlerId || (targetStaffId !== 0 ? targetStaffId : (staff?.id || 0));

      const res = await api.post('/work-plans', {
        planDate: dateStr, staffId: assignToStaffId, damageReportId: reportId,
        isNewTask: false, title: content.substring(0, 50), createdBy: user?.id
      });
      if (res.data.status) { toast.success('Đã thêm việc'); loadData(); }
    } catch (error) { toast.error('Lỗi khi thêm việc'); }
  };

  const handleCreateNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taskTab === 'general' && !newTask.title.trim()) { toast.warning('Nhập vị trí/mô tả chung'); return; }
    if (!newTask.damageContent.trim()) { toast.warning('Nhập nội dung'); return; }
    if (!newTask.staffId) { toast.warning('Vui lòng chọn người thực hiện'); return; }

    if (taskTab === 'device' && !newTask.deviceId) {
      toast.warning('Vui lòng chọn thiết bị');
      return;
    }

    try {
      const planDate = scheduleMode === 'date' ? format(planApplyDate, 'yyyy-MM-dd') : null;
      
      let finalTitle = newTask.title;
      if (taskTab === 'device') {
        const dev = devices.find(d => d.id === newTask.deviceId);
        finalTitle = dev ? dev.name : 'Báo cáo thiết bị';
      }

      const res = await api.post('/work-plans', {
        planDate, staffId: newTask.staffId, isNewTask: true,
        title: finalTitle,
        draftData: {
          deviceId: taskTab === 'device' ? newTask.deviceId : undefined, 
          damageLocation: taskTab === 'general' ? finalTitle : '',
          damageContent: newTask.damageContent, priority: newTask.priority,
          reporterId: staff?.id || newTask.staffId, reportingDepartmentId: staff?.departmentId || undefined
        },
        createdBy: user?.id
      });
      if (res.data.status) {
        toast.success('Đã thêm việc mới'); setIsModalOpen(false);
        setNewTask({ title: '', deviceId: undefined, damageLocation: '', damageContent: '', priority: DamageReportPriority.Normal, staffId: undefined });
        loadData();
        if (overdueDrawerOpen) loadArchiveItems();
      }
    } catch (error) { toast.error('Lỗi khi tạo việc'); }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (taskTab === 'general' && !newTask.title.trim()) { toast.warning('Nhập vị trí/mô tả chung'); return; }
    if (!newTask.damageContent.trim()) { toast.warning('Nhập nội dung'); return; }
    if (!newTask.staffId) { toast.warning('Vui lòng chọn người thực hiện'); return; }

    if (taskTab === 'device' && !newTask.deviceId) {
      toast.warning('Vui lòng chọn thiết bị');
      return;
    }

    try {
      const planDate = scheduleMode === 'date' ? format(planApplyDate, 'yyyy-MM-dd') : null;
      let finalTitle = newTask.title;
      if (taskTab === 'device') {
        const dev = devices.find(d => d.id === newTask.deviceId);
        finalTitle = dev ? dev.name : 'Báo cáo thiết bị';
      }

      if (modalMode === 'edit' && editingTaskId) {
        const res = await api.patch(`/work-plans/${editingTaskId}`, {
          action: 'update-details',
          staffId: newTask.staffId,
          isAdmin,
          title: finalTitle,
          draftData: {
            deviceId: taskTab === 'device' ? newTask.deviceId : undefined,
            damageLocation: taskTab === 'general' ? finalTitle : '',
            damageContent: newTask.damageContent,
            priority: newTask.priority,
            reporterId: staff?.id || newTask.staffId,
            reportingDepartmentId: staff?.departmentId || undefined
          }
        });
        if (res.data.status) {
          toast.success('Đã cập nhật công việc');
          setIsModalOpen(false);
          setNewTask({ title: '', deviceId: undefined, damageLocation: '', damageContent: '', priority: DamageReportPriority.Normal, staffId: undefined });
          loadData();
          if (overdueDrawerOpen) loadArchiveItems();
        }
      } else {
        const res = await api.post('/work-plans', {
          planDate,
          staffId: newTask.staffId,
          isNewTask: true,
          title: finalTitle,
          draftData: {
            deviceId: taskTab === 'device' ? newTask.deviceId : undefined,
            damageLocation: taskTab === 'general' ? finalTitle : '',
            damageContent: newTask.damageContent,
            priority: newTask.priority,
            reporterId: staff?.id || newTask.staffId,
            reportingDepartmentId: staff?.departmentId || undefined
          },
          createdBy: user?.id
        });
        if (res.data.status) {
          toast.success(scheduleMode === 'date' ? 'Đã lưu kế hoạch có ngày áp dụng' : 'Đã lưu vào kho kế hoạch');
          setIsModalOpen(false);
          setNewTask({ title: '', deviceId: undefined, damageLocation: '', damageContent: '', priority: DamageReportPriority.Normal, staffId: undefined });
          loadData();
          if (overdueDrawerOpen) loadArchiveItems();
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Lỗi khi tạo kế hoạch');
    }
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
      const res = await api.post(`/work-plans/${itemId}/implement`, { staffId: staff?.id || 0, userId: user?.id });
      if (res.data.status) { toast.success('Đã xác nhận triển khai'); loadData(); }
    } catch (error: any) { toast.error('Lỗi: ' + (error.response?.data?.error || error.message)); }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Xóa mục này?')) return;
    try {
      const res = await api.delete(`/work-plans?id=${itemId}&staffId=${staff?.id || 0}&isAdmin=${isAdmin}`);
      if (res.data.status) { toast.success('Đã xóa'); loadData(); }
    } catch (error) { toast.error('Lỗi khi xóa'); }
  };

  const handleMoveTask = async () => {
    if (!moveTaskModalData) return;
    try {
      const dateStr = format(moveTargetDate, 'yyyy-MM-dd');
      const res = await api.patch(`/work-plans/${moveTaskModalData.id}`, {
        planDate: dateStr,
        staffId: moveTaskModalData.staffId,
        isAdmin: isAdmin
      });
      if (res.data.status) {
        toast.success(`Đã chuyển sang ngày ${format(moveTargetDate, 'dd/MM/yyyy')}`);
        setMoveTaskModalData(null);
        loadData();
      }
    } catch (error) { toast.error('Lỗi khi chuyển công việc'); }
  };

  const handleMoveToArchiveFromList = async (item: WorkPlanItemVM) => {
    if (!window.confirm('Bạn có chắc muốn chuyển kế hoạch này lại kho?')) return;
    try {
      const res = await api.patch(`/work-plans/${item.id}`, {
        planDate: null,
        staffId: item.staffId,
        isAdmin: isAdmin
      });
      if (res.data.status) {
        toast.success('Đã chuyển lại kho kế hoạch');
        loadData();
      }
    } catch (error) { toast.error('Lỗi khi chuyển về kho'); }
  };

  const handleEditItem = (item: WorkPlanItemVM) => {
    setModalMode('edit');
    setEditingTaskId(item.id);
    setTaskTab(item.draftData?.deviceId ? 'device' : 'general');
    setNewTask({
      title: item.title,
      deviceId: item.draftData?.deviceId,
      damageLocation: item.draftData?.damageLocation || '',
      damageContent: item.draftData?.damageContent || '',
      priority: item.draftData?.priority || DamageReportPriority.Normal,
      staffId: item.staffId,
    });
    setIsModalOpen(true);
  };

  const getDateLabel = () => {
    if (isToday(selectedDate)) return 'Hôm nay';
    if (isTomorrow(selectedDate)) return 'Ngày mai';
    return format(selectedDate, 'eeee, dd/MM', { locale: vi });
  };

  if (loading && !staff) return <Loading />;

  if (!isAdmin) {
    return (
      <div className="container p-5 text-center mt-5">
        <div className="empty-state-icon text-danger mb-3" style={{ fontSize: '3rem' }}>
          <i className="fas fa-lock"></i>
        </div>
        <h4 className="text-danger fw-bold">Không có quyền truy cập</h4>
        <p className="text-muted">Tính năng này chỉ dành cho Admin và Quản trị viên.</p>
      </div>
    );
  }

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
          <button
            className="btn btn-outline-primary rounded-pill px-3 py-2 fw-bold d-flex align-items-center gap-2"
            onClick={() => { setOverdueDrawerOpen(true); loadArchiveItems(); }}
            title="Kho lưu trữ kế hoạch"
          >
            <i className="fas fa-box-archive"></i>
            <span className="d-none d-sm-inline">Kho kế hoạch</span>
          </button>
          <button className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2" onClick={() => { setModalMode('new'); setScheduleMode('archive'); setPlanApplyDate(selectedDate); setIsModalOpen(true); }}>
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
                          {item.isNewTask ? (
                            <>
                              <div className="fw-bold text-dark">{item.title}</div>
                              {item.draftData?.damageContent && item.draftData.damageContent !== item.title && (
                                <div className="mt-1 text-secondary" style={{ fontSize: '0.85rem' }}>
                                  {item.draftData.damageContent}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="fw-bold text-dark">{item.damageContent || item.title}</div>
                          )}
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
                            <button className="btn btn-icon btn-edit" onClick={() => handleEditItem(item)} title="Sửa công việc">
                              <i className="fas fa-edit"></i>
                            </button>
                          )}
                          {!item.isImplemented && (
                            <button className="btn btn-icon btn-move" onClick={() => setMoveTaskModalData(item)} title="Chuyển sang ngày khác">
                              <i className="fas fa-calendar-day"></i>
                            </button>
                          )}
                          {!item.isImplemented && (
                            <button className="btn btn-icon btn-archive" onClick={() => handleMoveToArchiveFromList(item)} title="Chuyển lại kho kế hoạch">
                              <i className="fas fa-box-archive"></i>
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

      {/* ===== OVERDUE BACKLOG DRAWER ===== */}
      {overdueDrawerOpen && (
        <>
          {/* Backdrop */}
          <div className="overdue-backdrop" onClick={() => setOverdueDrawerOpen(false)} />
          {/* Drawer */}
          <div className="overdue-drawer">
            {/* Drawer Header */}
            <div className="overdue-drawer-header">
              <div>
                <h5 className="m-0 fw-bold"><i className="fas fa-box-archive me-2 text-primary"></i>Kho kế hoạch</h5>
                <p className="m-0 text-muted small mt-1">Các kế hoạch chưa gán ngày áp dụng</p>
              </div>
              <button className="btn-close-custom" onClick={() => setOverdueDrawerOpen(false)}><i className="fas fa-times"></i></button>
            </div>

            {/* Bulk action bar */}
            <div className="overdue-bulk-bar">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <input
                  type="checkbox"
                  id="select-all-overdue"
                  className="form-check-input m-0"
                  checked={selectedOverdueIds.size === overdueItems.length && overdueItems.length > 0}
                  onChange={e => setSelectedOverdueIds(e.target.checked ? new Set(overdueItems.map(i => i.id)) : new Set())}
                />
                <label htmlFor="select-all-overdue" className="small fw-bold text-muted m-0">
                  Chọn tất cả ({selectedOverdueIds.size}/{overdueItems.length})
                </label>
              </div>
              <div className="d-flex align-items-center gap-2 flex-wrap mt-2">
                <span className="small text-muted fw-bold text-nowrap">Chuyển sang:</span>
                <DatePicker
                  selected={bulkTargetDate}
                  onChange={(d: Date) => setBulkTargetDate(d || addDays(new Date(), 1))}
                  dateFormat="dd/MM/yyyy"
                  highlightDates={activeDates}
                  className="form-control form-control-sm text-center fw-bold"
                  minDate={new Date()}
                  portalId="root-portal"
                />
                <button
                  className="btn btn-warning btn-sm fw-bold px-3 d-flex align-items-center gap-2"
                  onClick={handleMoveSelected}
                  disabled={selectedOverdueIds.size === 0}
                >
                  <i className="fas fa-arrows-rotate"></i>
                  Chuyển ({selectedOverdueIds.size})
                </button>
                <button
                  className="btn btn-outline-danger btn-sm fw-bold px-3 d-flex align-items-center gap-2"
                  onClick={handleDeleteSelectedOverdue}
                  disabled={selectedOverdueIds.size === 0}
                >
                  <i className="fas fa-trash"></i>
                  Xoá ({selectedOverdueIds.size})
                </button>
              </div>
            </div>

            {/* Items list */}
            <div className="overdue-drawer-body">
              {overdueLoading ? (
                <div className="text-center py-5"><div className="spinner-border text-warning" /></div>
              ) : overdueItems.length === 0 ? (
                <div className="text-center py-5">
                  <div style={{ fontSize: '3rem' }}>🎉</div>
                  <p className="text-muted mt-2">Kho kế hoạch đang trống.</p>
                </div>
              ) : (() => {
                // Group by planDate
                const groups: Record<string, WorkPlanItemVM[]> = {};
                overdueItems.forEach(item => {
                  const dk = item.planDate ? format(new Date(item.planDate), 'yyyy-MM-dd') : 'archive';
                  if (!groups[dk]) groups[dk] = [];
                  groups[dk].push(item);
                });
                return Object.entries(groups).map(([dateKey, groupItems]) => (
                  <div key={dateKey} className="overdue-group">
                    <div className="overdue-group-label">
                      <i className="fas fa-calendar-day me-2"></i>
                      {dateKey === 'archive' ? 'Chưa gán ngày áp dụng' : format(new Date(dateKey + 'T00:00:00'), 'EEEE, dd/MM/yyyy', { locale: vi })}
                      <span className="badge bg-danger-subtle text-danger ms-2">{groupItems.length} việc</span>
                    </div>
                    {groupItems.map(item => {
                      const isMoving = movingIds.has(item.id);
                      const itemDate = itemTargetDates[item.id] || addDays(new Date(), 1);
                      const isSelected = selectedOverdueIds.has(item.id);
                      return (
                        <div key={item.id} className={`overdue-item ${isSelected ? 'selected' : ''} ${isMoving ? 'moving' : ''}`}>
                          <input
                            type="checkbox"
                            className="form-check-input flex-shrink-0"
                            checked={isSelected}
                            onChange={e => setSelectedOverdueIds(prev => {
                              const s = new Set(prev);
                              e.target.checked ? s.add(item.id) : s.delete(item.id);
                              return s;
                            })}
                          />
                          <div className="overdue-item-info">
                            <div className="d-flex align-items-center gap-1 flex-wrap mb-1">
                              {item.maintenanceBatchId && <span className="mini-badge bg-primary">Bảo trì</span>}
                              {item.isNewTask && <span className="mini-badge bg-info">Mới</span>}
                              {!item.isNewTask && !item.maintenanceBatchId && <span className="mini-badge bg-warning">Tồn</span>}
                              {item.staffName && (
                                <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                                  <i className="fas fa-user me-1"></i>{item.staffName}
                                </span>
                              )}
                            </div>
                            {item.isNewTask ? (
                              <>
                                <div className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>
                                  {item.title}
                                </div>
                                {item.draftData?.damageContent && item.draftData.damageContent !== item.title && (
                                  <div className="mt-1 text-secondary" style={{ fontSize: '0.8rem' }}>
                                    {item.draftData.damageContent}
                                  </div>
                                )}
                              </>
                            ) : item.maintenanceBatchId ? (
                              <>
                                <div className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>
                                  {item.maintenanceTitle || item.maintenanceBatchId}
                                </div>
                                {item.damageContent && item.damageContent !== (item.maintenanceTitle || item.maintenanceBatchId) && (
                                  <div className="mt-1 text-secondary" style={{ fontSize: '0.8rem' }}>
                                    {item.damageContent}
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>
                                  {item.damageContent || item.title}
                                </div>
                                {(item.deviceName || item.location) && (
                                  <div className="mt-1 text-muted" style={{ fontSize: '0.75rem' }}>
                                    <i className="fas fa-map-marker-alt me-1"></i>
                                    {item.deviceName
                                      ? `${item.deviceName}${item.location ? ` — ${item.location}` : ''}`
                                      : item.location}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className="overdue-item-action">
                            <DatePicker
                              selected={itemDate}
                              onChange={(d: Date) => setItemTargetDates(prev => ({ ...prev, [item.id]: d || addDays(new Date(), 1) }))}
                              dateFormat="dd/MM"
                              highlightDates={activeDates}
                              className="form-control form-control-sm text-center fw-bold"
                              minDate={new Date()}
                              portalId="root-portal"
                            />
                            <div className="d-flex align-items-center gap-2 mt-2 w-100 justify-content-end">
                              {item.isNewTask && (
                                <button
                                  className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center"
                                  style={{ width: '32px', height: '32px', padding: 0 }}
                                  onClick={() => handleEditItem(item)}
                                  disabled={isMoving}
                                  title="Sửa kế hoạch này"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                              )}
                              <button
                                className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center"
                                style={{ width: '32px', height: '32px', padding: 0 }}
                                onClick={() => handleDeleteOverdueItem(item)}
                                disabled={isMoving}
                                title="Xoá kế hoạch này"
                              >
                                {isMoving
                                  ? <span className="spinner-border spinner-border-sm" />
                                  : <i className="fas fa-trash"></i>}
                              </button>
                              <button
                                className="btn btn-sm btn-primary d-flex align-items-center gap-1 text-nowrap"
                                onClick={() => handleMoveItem(item, itemDate)}
                                disabled={isMoving}
                              >
                                {isMoving
                                  ? <span className="spinner-border spinner-border-sm" />
                                  : <><i className="fas fa-arrow-right"></i><span>Chuyển</span></>}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
          </div>
        </>
      )}

      {/* Move Task Modal */}
      {moveTaskModalData && (
        <div className="custom-modal-overlay">
          <div className="custom-modal glass-card p-0 shadow-lg border-0" style={{ maxWidth: '400px' }}>
            <div className="modal-header-premium p-3 border-bottom bg-white d-flex justify-content-between align-items-center" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
              <h5 className="m-0 fw-bold text-dark">Chuyển ngày</h5>
              <button className="btn-close-custom" onClick={() => setMoveTaskModalData(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="modal-body p-4 bg-white text-center" style={{ borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
              <p className="mb-3 text-muted small">Chọn ngày để chuyển công việc này:</p>
              <div className="d-flex justify-content-center mb-4">
                <DatePicker
                  selected={moveTargetDate}
                  onChange={(date: Date) => setMoveTargetDate(date || new Date())}
                  dateFormat="dd/MM/yyyy"
                  highlightDates={activeDates}
                  className="form-control form-control-premium text-center fw-bold"
                  minDate={new Date()}
                  portalId="root-portal"
                />
              </div>
              <div className="d-flex gap-2 justify-content-center">
                <button className="btn btn-light px-4" onClick={() => setMoveTaskModalData(null)}>Hủy</button>
                <button className="btn btn-warning px-4 d-flex align-items-center gap-2" onClick={handleMoveTask}>
                  <i className="fas fa-calendar-check"></i>
                  <span>Chuyển ngay</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Modal */}
      {isModalOpen && (
        <div className="custom-modal-overlay">
          <div className="custom-modal glass-card p-0 overflow-hidden shadow-lg border-0" style={{ maxWidth: '620px' }}>
            <div className="modal-header-premium compact p-3 border-bottom bg-white d-flex justify-content-between align-items-center">
              <div>
                <h4 className="m-0 fw-bold text-dark">{modalMode === 'edit' ? 'Sửa công việc' : 'Lên kế hoạch mới'}</h4>
              </div>
              <button className="btn-close-custom" onClick={() => setIsModalOpen(false)}><i className="fas fa-times"></i></button>
            </div>

            <div className="modal-tabs-container compact bg-white p-2 d-flex gap-2 border-bottom">
              <button 
                type="button"
                className={`modal-tab-btn flex-fill btn fw-bold d-flex align-items-center justify-content-center gap-2 transition-all ${taskTab === 'general' ? 'active' : ''}`}
                onClick={() => setTaskTab('general')}
              >
                <i className="fas fa-tasks"></i>
                Công việc chung
              </button>
              <button 
                type="button"
                className={`modal-tab-btn flex-fill btn fw-bold d-flex align-items-center justify-content-center gap-2 transition-all ${taskTab === 'device' ? 'active' : ''}`}
                onClick={() => setTaskTab('device')}
              >
                <i className="fas fa-tools"></i>
                Việc cho thiết bị
              </button>
            </div>

            <div className="modal-body compact p-3 bg-white">
              <form onSubmit={handleSavePlan}>
                {modalMode !== 'edit' && (
                  <div className="schedule-option-box compact mb-3">
                    <div className="schedule-inline-row">
                      <span className="schedule-label small fw-bold text-uppercase ls-1">Ngày áp dụng</span>
                      <label className="schedule-check m-0">
                        <input
                          type="checkbox"
                          checked={scheduleMode === 'date'}
                          onChange={e => setScheduleMode(e.target.checked ? 'date' : 'archive')}
                        />
                        <span>Gán ngày áp dụng</span>
                      </label>
                      {scheduleMode === 'date' && (
                        <DatePicker
                          selected={planApplyDate}
                          onChange={(date: Date) => setPlanApplyDate(date || addDays(new Date(), 1))}
                          dateFormat="dd/MM/yyyy"
                          minDate={new Date()}
                          className="form-control form-control-premium schedule-date-input"
                          portalId="root-portal"
                        />
                      )}
                    </div>
                  </div>
                )}
                <div className="row g-2">
                  {/* Title only for General Task */}
                  {taskTab === 'general' && (
                    <div className="col-12 animate-fade-in">
                      <label className="form-label small fw-bold text-uppercase ls-1">Vị trí/Mô tả chung <span className="text-danger">*</span></label>
                      <input type="text" className="form-control form-control-premium" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} placeholder="VD: Tường hành lang, hệ thống điện..." required={taskTab === 'general'} />
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
                    <label className="form-label small fw-bold text-uppercase ls-1">Nội dung <span className="text-danger">*</span></label>
                    <textarea className="form-control form-control-premium" rows={2} value={newTask.damageContent} onChange={e => setNewTask({...newTask, damageContent: e.target.value})} placeholder="Mô tả ngắn gọn việc cần làm..." required></textarea>
                  </div>
                </div>

                <div className="modal-footer-compact d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center mt-3 pt-3 border-top gap-2">
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
                  <button type="submit" className="btn btn-primary px-4 py-2 rounded-3 shadow fw-bold d-flex align-items-center justify-content-center gap-2">
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
        .btn-edit { background: #f8f9fa; color: #495057; }
        .btn-edit:hover { background: #495057; color: white; }
        .btn-move { background: #fff8e6; color: #f59f00; }
        .btn-move:hover { background: #f59f00; color: white; }
        .btn-archive { background: #f3f0ff; color: #845ef7; }
        .btn-archive:hover { background: #845ef7; color: white; }
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
        .modal-header-premium.compact h4 { font-size: 1.25rem; line-height: 1.25; }
        .modal-tabs-container.compact { background: #fff; }
        .modal-tab-btn { border: 1px solid transparent; border-radius: 8px; padding: 8px 10px; color: #495057; background: transparent; font-size: 0.9rem; }
        .modal-tab-btn:hover { background: #f8f9fa; color: #0d6efd; }
        .modal-tab-btn.active { color: #0d6efd; background: #f4f8ff; border-color: #dce9ff; box-shadow: none; }
        .modal-body.compact .form-label { margin-bottom: 6px; }
        .schedule-option-box.compact { padding: 0; }
        .schedule-inline-row { display: flex; align-items: center; gap: 12px; min-height: 38px; }
        .schedule-label { color: #343a40; min-width: 108px; margin: 0; }
        .schedule-check { display: inline-flex; align-items: center; gap: 8px; color: #212529; font-size: 0.92rem; font-weight: 600; cursor: pointer; user-select: none; }
        .schedule-check input { width: 16px; height: 16px; accent-color: #0d6efd; cursor: pointer; }
        .schedule-date-input { width: 150px; padding-top: 8px; padding-bottom: 8px; }
        @media (max-width: 575.98px) {
          .schedule-inline-row { flex-wrap: wrap; gap: 8px 10px; }
          .schedule-label { width: 100%; min-width: 0; }
          .schedule-date-input { width: 100%; }
        }
        .modal-footer-compact .btn-group-sm > .btn { padding: 5px 12px; }
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
        .form-control-premium { border-radius: 10px; border: 1px solid #e9ecef; padding: 10px 14px; font-size: 0.95rem; background: #fcfcfc; }
        .form-control-premium:focus { background: white; border-color: #0d6efd; box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.1); }
        .input-group-text { border-radius: 10px 0 0 10px; border: 1px solid #e9ecef; }
        .ls-1 { letter-spacing: 0.5px; }
        .btn-white { background: white; border: 1px solid rgba(0,0,0,0.05); }
        .btn-soft-primary { background: #e7f5ff; color: #0d6efd; }

        /* ===== OVERDUE BACKLOG DRAWER ===== */
        .overdue-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 1040; backdrop-filter: blur(2px); animation: backdropFade 0.2s ease; }
        @keyframes backdropFade { from { opacity: 0; } to { opacity: 1; } }

        .overdue-drawer { position: fixed; top: 0; right: 0; height: 100vh; width: 100%; max-width: 520px; background: #fff; z-index: 1045; display: flex; flex-direction: column; box-shadow: -8px 0 40px rgba(0,0,0,0.12); animation: drawerSlideIn 0.3s cubic-bezier(0.4,0,0.2,1); }
        @keyframes drawerSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .overdue-drawer-header { padding: 20px 24px; border-bottom: 1px solid #f1f3f5; display: flex; justify-content: space-between; align-items: flex-start; flex-shrink: 0; background: #fffbeb; }

        .overdue-bulk-bar { padding: 12px 20px; border-bottom: 1px solid #f1f3f5; background: #f8f9fa; flex-shrink: 0; }

        .overdue-drawer-body { flex: 1; overflow-y: auto; padding: 12px 16px; }

        .overdue-group { margin-bottom: 16px; }
        .overdue-group-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #6c757d; padding: 6px 10px; background: #f8f9fa; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; }

        .overdue-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid #e9ecef; background: white; margin-bottom: 6px; transition: all 0.2s; }
        .overdue-item:hover { border-color: #ced4da; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
        .overdue-item.selected { border-color: #ffc107; background: #fffbeb; }
        .overdue-item.moving { opacity: 0.5; pointer-events: none; }
        .overdue-item-info { flex: 1; min-width: 0; }
        .overdue-item-action { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
      `}</style>
    </div>
  );
}
