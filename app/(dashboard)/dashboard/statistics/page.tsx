'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { exportToExcel } from '@/lib/utils/excelExporter.client';
import Loading from '@/components/Loading';

export default function StatisticsPage() {
  const [activeTab, setActiveTab] = useState<'devices' | 'reports'>('devices');
  
  // States for local filters
  const [deviceFilters, setDeviceFilters] = useState({ deptId: 0, locId: 0 });
  const [reportFilters, setReportFilters] = useState({ deptId: 0, locId: 0, fromDate: '', toDate: '' });

  // Preview toggle states
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);

  // Static data loading
  const { data: deptData } = useSWR('/departments', fetcher);
  const departments = deptData?.data || [];
  const { data: locData } = useSWR('/locations', fetcher);
  const locations = locData?.data || [];

  // Summary Data fetch logic
  const getSummaryUrl = (tab: string, filters: any) => {
    const params = new URLSearchParams();
    if (filters.deptId > 0) params.append('departmentId', filters.deptId.toString());
    if (filters.locId > 0) params.append('locationId', filters.locId.toString());
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    return `/statistics/summary?${params.toString()}`;
  };

  const { data: deviceSummary } = useSWR(getSummaryUrl('devices', deviceFilters), fetcher);
  const { data: reportSummary } = useSWR(getSummaryUrl('reports', reportFilters), fetcher);

  // Preview Data fetch logic
  const getPreviewUrl = (tab: string, filters: any) => {
    if (!showPreview[tab]) return null;
    const params = new URLSearchParams();
    params.append('type', tab);
    if (filters.deptId > 0) params.append('departmentId', filters.deptId.toString());
    if (filters.locId > 0) params.append('locationId', filters.locId.toString());
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    
    // Different endpoint for reports
    const endpoint = tab === 'reports' ? '/damage-reports/export' : '/statistics/export';
    params.append('preview', 'true');
    
    return `${endpoint}?${params.toString()}`;
  };

  const { data: deviceList, isLoading: devListLoading } = useSWR(getPreviewUrl('devices', deviceFilters), fetcher);
  const { data: reportList, isLoading: repListLoading } = useSWR(getPreviewUrl('reports', reportFilters), fetcher);

  const togglePreview = (tab: string) => {
    setShowPreview(prev => ({ ...prev, [tab]: !prev[tab] }));
  };

  // --- Column Configuration State ---
  type ColMeta = { id: string, visible: boolean };
  const [colsDevice, setColsDevice] = useState<ColMeta[]>([]);
  const [colsReport, setColsReport] = useState<ColMeta[]>([]);
  const [colDropdownTab, setColDropdownTab] = useState<string | null>(null);

  // Initialize columns when data arrives and config is empty
  useEffect(() => {
    if (deviceList?.data && deviceList.data.length > 0 && colsDevice.length === 0) {
      setColsDevice(Object.keys(deviceList.data[0]).map(k => ({ id: k, visible: true })));
    }
  }, [deviceList]);
  
  useEffect(() => {
    if (reportList?.data && reportList.data.length > 0 && colsReport.length === 0) {
      setColsReport(Object.keys(reportList.data[0]).map(k => ({ id: k, visible: true })));
    }
  }, [reportList]);
  

  // Export Logic Directly
  const handleExport = async (tab: string, filters: any, cols: ColMeta[]) => {
    setIsExporting(true);
    let toastId = toast.loading('Đang chuẩn bị dữ liệu xuất...');
    try {
      const params = new URLSearchParams();
      params.append('type', tab);
      if (filters.deptId > 0) params.append('departmentId', filters.deptId.toString());
      if (filters.locId > 0) params.append('locationId', filters.locId.toString());
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      params.append('preview', 'true'); 
      
      const endpoint = tab === 'reports' ? '/damage-reports/export' : '/statistics/export';
      const response = await api.get(`${endpoint}?${params.toString()}`);
      
      if (!response.data.status) throw new Error(response.data.error || 'Lỗi lấy dữ liệu export');
      
      const exportData = response.data.data || [];
      if (exportData.length === 0) {
        toast.update(toastId, { render: 'Không có dữ liệu để xuất', type: 'warning', isLoading: false, autoClose: 3000 });
        return;
      }

      const visibleColIds = cols.filter(c => c.visible).map(c => c.id);
      const titlePrefix = tab === 'devices' ? 'THIẾT BỊ' : 'BÁO CÁO';
      
      // Map columns for the exporter
      const columns = visibleColIds.map(id => ({
        id: id,
        label: id, // Since backend already sends friendly names as keys
        width: id === 'Ghi chú' || id === 'Hư hỏng' ? 40 : 20
      }));

      await exportToExcel({
        title: `THỐNG KÊ CHI TIẾT ${titlePrefix}`,
        filename: `Thống_kê_${tab}`,
        columns: columns,
        data: exportData
      });
      
      toast.update(toastId, { render: 'Xuất Excel thành công!', type: 'success', isLoading: false, autoClose: 3000 });
    } catch (error: any) {
      console.error(error);
      toast.update(toastId, { render: 'Lỗi khi xuất file Excel!', type: 'error', isLoading: false, autoClose: 3000 });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container-fluid px-3 py-2">
      {/* Page Header - Compact */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-0" style={{ color: '#1e293b' }}>Thống kê & Báo cáo</h5>
          <p className="text-muted small mb-0">Dữ liệu thời gian thực và trích xuất chuyên nghiệp</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white border-0 pt-3 pb-0">
          <ul className="nav nav-pills gap-2 pb-2 border-bottom">
            <li className="nav-item">
              <button 
                className={`nav-link px-4 py-2 fw-bold position-relative ${activeTab === 'devices' ? 'active bg-primary' : 'text-muted bg-light border'}`}
                onClick={() => setActiveTab('devices')}
                style={{ borderRadius: '8px', zIndex: 1 }}
              >
                <i className="fas fa-desktop me-2"></i>Thiết bị
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link px-4 py-2 fw-bold ${activeTab === 'reports' ? 'active bg-success' : 'text-muted bg-light border'}`}
                onClick={() => setActiveTab('reports')}
                style={{ borderRadius: '8px' }}
              >
                <i className="fas fa-file-invoice me-2"></i>Sự cố & Báo cáo
              </button>
            </li>
          </ul>
        </div>
        
        <div className="card-body pt-3">
          {/* Tab Content: Devices */}
          {activeTab === 'devices' && (
            <div>
              <div className="row g-2 align-items-end mb-4 bg-light p-2 rounded-3 mx-0 border">
                <div className="col-12 col-md-4">
                  <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Phòng ban</label>
                  <select 
                    className="form-select form-select-sm border shadow-none"
                    value={deviceFilters.deptId}
                    onChange={e => setDeviceFilters(prev => ({ ...prev, deptId: Number(e.target.value) }))}
                  >
                    <option value="0">Tất cả</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-4">
                   <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Vị trí</label>
                   <select 
                    className="form-select form-select-sm border shadow-none"
                    value={deviceFilters.locId}
                    onChange={e => setDeviceFilters(prev => ({ ...prev, locId: Number(e.target.value) }))}
                  >
                    <option value="0">Tất cả</option>
                    {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-4 d-flex gap-2 justify-content-end">
                   <div className="d-flex gap-2 position-relative w-100">
                     <button className="btn btn-sm btn-outline-primary flex-grow-1 fw-bold" onClick={() => togglePreview('devices')}>
                       <i className={`fas ${showPreview.devices ? 'fa-eye-slash' : 'fa-list-ul'} me-2`}></i>
                       {showPreview.devices ? 'Đóng ds' : 'Xem danh sách'}
                     </button>
                     
                     <ColumnDropdown 
                       isOpen={colDropdownTab === 'devices'}
                       onToggle={() => setColDropdownTab(prev => prev === 'devices' ? null : 'devices')}
                       cols={colsDevice}
                       setCols={setColsDevice}
                       disabled={colsDevice.length === 0}
                     />

                     <button 
                       className="btn btn-sm btn-primary px-3 fw-bold flex-grow-1" 
                       onClick={() => handleExport('devices', deviceFilters, colsDevice)}
                       disabled={isExporting}
                     >
                       <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-excel'} me-1`}></i> Xuất
                     </button>
                   </div>
                </div>
              </div>

              {/* Device Stats Grid */}
              <div className="row g-3 mb-4">
                {[
                  { label: 'Tổng số', value: deviceSummary?.data?.devices?.total, color: 'primary', icon: 'fa-box' },
                  { label: 'Đang dùng', value: deviceSummary?.data?.devices?.dangSuDung, color: 'success', icon: 'fa-check-circle' },
                  { label: 'Đang sửa chữa', value: deviceSummary?.data?.devices?.dangSuaChua, color: 'warning', icon: 'fa-wrench' },
                  { label: 'Có hư hỏng', value: deviceSummary?.data?.devices?.coHuHong, color: 'info', icon: 'fa-exclamation-triangle' },
                  { label: 'Hư hỏng', value: deviceSummary?.data?.devices?.huHong, color: 'danger', icon: 'fa-times-circle' },
                  { label: 'Thanh lý', value: deviceSummary?.data?.devices?.daThanhLy, color: 'secondary', icon: 'fa-trash-alt' },
                ].map((stat, idx) => (
                  <div key={idx} className="col-6 col-md-4 col-lg-2">
                    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0 !important' }}>
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <p className="x-small text-muted mb-0 uppercase fw-bold" style={{ fontSize: '0.65rem' }}>{stat.label}</p>
                            <h3 className={`fw-bold mb-0 text-${stat.color}`}>{stat.value ?? 0}</h3>
                          </div>
                          <div className={`p-2 bg-${stat.color} bg-opacity-10 text-${stat.color} rounded-3`}>
                            <i className={`fas ${stat.icon} fa-fw`}></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {showPreview.devices && <PreviewTable data={deviceList?.data} loading={devListLoading} color="primary" configCols={colsDevice} />}
            </div>
          )}

          {/* Tab Content: Reports */}
          {activeTab === 'reports' && (
            <div>
              <div className="row g-2 align-items-end mb-4 bg-light p-2 rounded-3 mx-0 border">
                <div className="col-12 col-md-3">
                  <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Phòng ban</label>
                  <select 
                    className="form-select form-select-sm border shadow-none"
                    value={reportFilters.deptId}
                    onChange={e => setReportFilters(prev => ({ ...prev, deptId: Number(e.target.value) }))}
                  >
                    <option value="0">Tất cả</option>
                    {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-2">
                  <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Từ ngày</label>
                  <input type="date" className="form-control form-control-sm border shadow-none" value={reportFilters.fromDate} onChange={e => setReportFilters(prev => ({ ...prev, fromDate: e.target.value }))} />
                </div>
                <div className="col-12 col-md-2">
                  <label className="form-label x-small fw-bold text-muted mb-1 uppercase">Đến ngày</label>
                  <input type="date" className="form-control form-control-sm border shadow-none" value={reportFilters.toDate} onChange={e => setReportFilters(prev => ({ ...prev, toDate: e.target.value }))} />
                </div>
                <div className="col-12 col-md-5 d-flex gap-2 justify-content-end">
                   <div className="d-flex gap-2 position-relative w-100">
                     <button className="btn btn-sm btn-outline-success flex-grow-1 fw-bold" onClick={() => togglePreview('reports')}>
                       <i className={`fas ${showPreview.reports ? 'fa-eye-slash' : 'fa-list-ul'} me-2`}></i>
                       {showPreview.reports ? 'Đóng ds' : 'Xem danh sách'}
                     </button>
                     
                     <ColumnDropdown 
                       isOpen={colDropdownTab === 'reports'}
                       onToggle={() => setColDropdownTab(prev => prev === 'reports' ? null : 'reports')}
                       cols={colsReport}
                       setCols={setColsReport}
                       disabled={colsReport.length === 0}
                     />

                     <button 
                       className="btn btn-sm btn-success px-3 fw-bold flex-grow-1" 
                       onClick={() => handleExport('reports', reportFilters, colsReport)}
                       disabled={isExporting}
                     >
                       <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-excel'} me-1`}></i> Xuất
                     </button>
                   </div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                {[
                  { label: 'Tổng báo cáo', value: reportSummary?.data?.reports?.total, color: 'success', icon: 'fa-clipboard-list' },
                  { label: 'Chờ xử lý', value: reportSummary?.data?.reports?.pending, color: 'secondary', icon: 'fa-hourglass-start' },
                  { label: 'Đang xử lý', value: reportSummary?.data?.reports?.inProgress, color: 'info', icon: 'fa-spinner' },
                  { label: 'Hoàn thành', value: reportSummary?.data?.reports?.completed, color: 'primary', icon: 'fa-check-double' },
                  { label: 'Đã hủy', value: reportSummary?.data?.reports?.cancelled, color: 'danger', icon: 'fa-ban' },
                  { label: 'Từ chối', value: reportSummary?.data?.reports?.rejected, color: 'dark', icon: 'fa-user-times' },
                ].map((stat, idx) => (
                  <div key={idx} className="col-6 col-md-4 col-lg-2">
                    <div className="card border-0 shadow-sm h-100" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0 !important' }}>
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <p className="x-small text-muted mb-0 uppercase fw-bold" style={{ fontSize: '0.65rem' }}>{stat.label}</p>
                            <h3 className={`fw-bold mb-0 text-${stat.color}`}>{stat.value ?? 0}</h3>
                          </div>
                          <div className={`p-2 bg-${stat.color} bg-opacity-10 text-${stat.color} rounded-3`}>
                            <i className={`fas ${stat.icon} fa-fw`}></i>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {showPreview.reports && <PreviewTable data={reportList?.data} loading={repListLoading} color="success" configCols={colsReport} />}
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        .x-small { font-size: 0.75rem; }
        .uppercase { text-transform: uppercase; letter-spacing: 0.025em; }
        .nav-link.active { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
      `}</style>
    </div>
  );
}

function PreviewTable({ data, loading, color, configCols }: { data: any[], loading: boolean, color: string, configCols: {id: string, visible: boolean}[] }) {
  if (loading) return <Loading />;
  if (!data || data.length === 0) return <div className="alert alert-light text-center border p-4 my-3 text-muted" style={{ borderRadius: '12px' }}><i className="fas fa-search me-2"></i>Không tìm thấy dữ liệu phù hợp với bộ lọc</div>;

  const visibleColIds = configCols && configCols.length > 0 
    ? configCols.filter(c => c.visible).map(c => c.id)
    : Object.keys(data[0]);

  if (visibleColIds.length === 0) {
    return <div className="alert alert-warning text-center border p-3 small">Vui lòng chọn ít nhất 1 cột để hiển thị</div>
  }

  return (
    <div className="card border shadow-sm mt-3 animate__animated animate__fadeIn" style={{ borderRadius: '12px', overflow: 'hidden' }}>
      <div className="table-responsive" style={{ maxHeight: '500px' }}>
        <table className="table table-sm table-hover mb-0 align-middle" style={{ fontSize: '0.8rem' }}>
          <thead className={`bg-${color} bg-opacity-10 text-${color} sticky-top`} style={{ zIndex: 10 }}>
            <tr>
              {visibleColIds.map(h => <th key={h} className="px-3 py-2 text-nowrap fw-bold uppercase" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 50).map((row, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                {visibleColIds.map(h => (
                  <td key={h} className="px-3 py-2 text-nowrap text-truncate" style={{ maxWidth: '250px', color: '#334155' }}>
                    {String(row[h] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-footer bg-light text-muted x-small d-flex justify-content-between align-items-center py-2 px-3 border-0">
        <span>Hiển thị tối đa 50 dòng trong bản xem trước. Số dòng tải về: {data.length}.</span>
        <span className="fw-bold">Mẹo: Thay đổi thứ tự cột bằng nút cấu hình "Cột".</span>
      </div>
    </div>
  );
}

function ColumnDropdown({ isOpen, onToggle, cols, setCols, disabled }: { isOpen: boolean, onToggle: () => void, cols: {id: string, visible: boolean}[], setCols: any, disabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        if (isOpen) onToggle();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onToggle]);

  const toggleVisible = (idx: number) => {
    const newCols = [...cols];
    newCols[idx].visible = !newCols[idx].visible;
    setCols(newCols);
  };

  const moveCol = (idx: number, dir: 'up' | 'down') => {
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === cols.length - 1)) return;
    const newCols = [...cols];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    [newCols[idx], newCols[target]] = [newCols[target], newCols[idx]];
    setCols(newCols);
  };

  return (
    <div className="position-relative" ref={ref}>
      <button 
        className="btn btn-sm btn-outline-secondary fw-bold px-3 d-flex align-items-center h-100"
        onClick={onToggle}
        disabled={disabled}
      >
        <i className="fas fa-columns me-1"></i> Cột
      </button>
      
      {isOpen && !disabled && (
        <div className="position-absolute bg-white shadow-lg border p-2 text-start animate__animated animate__fadeIn" style={{ zIndex: 1050, top: '110%', right: '0', width: '280px', borderRadius: '8px' }}>
          <div className="text-muted fw-bold x-small uppercase mb-2 border-bottom pb-1">Tuỳ chỉnh cột ({cols.filter(c => c.visible).length}/{cols.length})</div>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }} className="pe-1">
            {cols.map((col, idx) => (
              <div key={col.id} className="d-flex align-items-center justify-content-between py-1 border-bottom" style={{ borderColor: '#f1f5f9 !important' }}>
                <div className="form-check form-switch mb-0 d-flex align-items-center m-0 p-0 ps-4">
                  <input className="form-check-input mt-0 me-2" type="checkbox" role="switch" checked={col.visible} onChange={() => toggleVisible(idx)} style={{ cursor: 'pointer' }} />
                  <label className="form-check-label x-small text-truncate" style={{ width: '140px', cursor: 'pointer' }} onClick={() => toggleVisible(idx)} title={col.id}>{col.id}</label>
                </div>
                <div className="btn-group">
                  <button className="btn btn-sm btn-light p-1" onClick={() => moveCol(idx, 'up')} disabled={idx === 0}><i className="fas fa-chevron-up text-muted"></i></button>
                  <button className="btn btn-sm btn-light p-1" onClick={() => moveCol(idx, 'down')} disabled={idx === cols.length - 1}><i className="fas fa-chevron-down text-muted"></i></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
