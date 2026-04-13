'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import ExportModal from '@/components/ExportModal';

export default function StatisticsPage() {
  const [departmentId, setDepartmentId] = useState(0);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportType, setExportType] = useState<'devices' | 'reports' | 'maintenance'>('devices');

  // Load departments
  const { data: deptData } = useSWR('/departments', fetcher);
  const departments = deptData?.data || [];

  // Summary URL based on current selected filters
  const summaryQueryParams = new URLSearchParams();
  if (departmentId > 0) summaryQueryParams.append('departmentId', departmentId.toString());
  if (fromDate) summaryQueryParams.append('fromDate', fromDate);
  if (toDate) summaryQueryParams.append('toDate', toDate);

  const summaryUrl = `/statistics/summary?${summaryQueryParams.toString()}`;
  const { data: summaryData, error, isLoading } = useSWR(summaryUrl, fetcher);

  const stats = summaryData?.data;

  const handleOpenExport = (type: 'devices' | 'reports' | 'maintenance') => {
    setExportType(type);
    setExportModalVisible(true);
  };

  const getExportTitle = () => {
    switch(exportType) {
      case 'devices': return 'Tiến hành xuất Thống kê Thiết bị';
      case 'reports': return 'Tiến hành xuất Thống kê Báo cáo sự cố';
      case 'maintenance': return 'Tiến hành xuất Thống kê Bảo trì';
    }
  };

  return (
    <div className="container-fluid px-md-4 py-md-3">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div>
          <h3 className="fw-bold mb-1" style={{ color: '#2c3e50' }}>Thống kê tổng hợp</h3>
          <p className="text-muted mb-0">Theo dõi số lượng và xuất biểu mẫu chuyên nghiệp</p>
        </div>
      </div>

      {/* Global Filter */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-body">
          <h6 className="card-title fw-bold text-muted mb-3"><i className="fas fa-filter me-2"></i>Bộ lọc toàn cục</h6>
          <div className="row g-3">
            <div className="col-12 col-md-4 col-lg-3">
              <label className="form-label small fw-semibold">Phòng ban</label>
              <select 
                className="form-select border-0 bg-light"
                value={departmentId}
                onChange={(e) => setDepartmentId(Number(e.target.value))}
              >
                <option value="0">Tất cả phòng ban / chi nhánh</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="col-12 col-md-4 col-lg-3">
              <label className="form-label small fw-semibold">Từ ngày</label>
              <input 
                type="date" 
                className="form-control border-0 bg-light"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-4 col-lg-3">
              <label className="form-label small fw-semibold">Đến ngày</label>
              <input 
                type="date" 
                className="form-control border-0 bg-light"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="col-12 col-lg-3 d-flex align-items-end">
               <button className="btn btn-outline-secondary w-100" onClick={() => {
                 setDepartmentId(0);
                 setFromDate('');
                 setToDate('');
               }}>
                 Làm mới bộ lọc
               </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-5">
           <div className="spinner-border text-primary" role="status"></div>
           <p className="mt-2 text-muted">Đang lấy dữ liệu thống kê...</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="alert alert-danger" role="alert">
          Lỗi khi tải dữ liệu thống kê: {error.message || 'Hệ thống đang bảo trì'}
        </div>
      )}

      {stats && !isLoading && (
        <div className="row g-4">
          
          {/* Card: Thiết Bị */}
          <div className="col-12 col-xl-4">
             <div className="card h-100 shadow-sm border-0" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0 text-primary"><i className="fas fa-desktop me-2"></i>Thiết bị</h5>
                  <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fs-6">{stats.devices.total}</span>
                </div>
                <div className="card-body px-4">
                   <div className="mb-4">
                     <div className="d-flex justify-content-between mb-1 small text-muted">
                        <span>Đang sử dụng</span>
                        <span className="fw-bold text-dark">{stats.devices.active}</span>
                     </div>
                     <div className="progress" style={{ height: '6px' }}>
                        <div className="progress-bar bg-success" style={{ width: `${stats.devices.total ? (stats.devices.active / stats.devices.total) * 100 : 0}%` }}></div>
                     </div>
                   </div>

                   <div className="mb-4">
                     <div className="d-flex justify-content-between mb-1 small text-muted">
                        <span>Đang sửa chữa / Bảo trì</span>
                        <span className="fw-bold text-dark">{stats.devices.maintenance}</span>
                     </div>
                     <div className="progress" style={{ height: '6px' }}>
                        <div className="progress-bar bg-warning" style={{ width: `${stats.devices.total ? (stats.devices.maintenance / stats.devices.total) * 100 : 0}%` }}></div>
                     </div>
                   </div>

                   <div className="mb-4">
                     <div className="d-flex justify-content-between mb-1 small text-muted">
                        <span>Hư hỏng</span>
                        <span className="fw-bold text-dark">{stats.devices.broken}</span>
                     </div>
                     <div className="progress" style={{ height: '6px' }}>
                        <div className="progress-bar bg-danger" style={{ width: `${stats.devices.total ? (stats.devices.broken / stats.devices.total) * 100 : 0}%` }}></div>
                     </div>
                   </div>

                   <button 
                     className="btn btn-primary w-100 fw-bold" 
                     style={{ borderRadius: '10px' }}
                     onClick={() => handleOpenExport('devices')}
                   >
                     <i className="fas fa-file-excel me-2"></i> Xuất Excel Thiết Bị
                   </button>
                </div>
             </div>
          </div>

          {/* Card: Báo cáo công việc */}
          <div className="col-12 col-xl-4">
             <div className="card h-100 shadow-sm border-0" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0 text-success"><i className="fas fa-file-invoice me-2"></i>Sự cố & Báo cáo</h5>
                  <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill fs-6">{stats.reports.total}</span>
                </div>
                <div className="card-body px-4">
                   <div className="mb-4">
                     <div className="d-flex justify-content-between mb-1 small text-muted">
                        <span>Hoàn thành xử lý</span>
                        <span className="fw-bold text-dark">{stats.reports.completed}</span>
                     </div>
                     <div className="progress" style={{ height: '6px' }}>
                        <div className="progress-bar bg-success" style={{ width: `${stats.reports.total ? (stats.reports.completed / stats.reports.total) * 100 : 0}%` }}></div>
                     </div>
                   </div>

                   <div className="mb-4">
                     <div className="d-flex justify-content-between mb-1 small text-muted">
                        <span>Đang xử lý</span>
                        <span className="fw-bold text-dark">{stats.reports.inProgress}</span>
                     </div>
                     <div className="progress" style={{ height: '6px' }}>
                        <div className="progress-bar bg-info" style={{ width: `${stats.reports.total ? (stats.reports.inProgress / stats.reports.total) * 100 : 0}%` }}></div>
                     </div>
                   </div>

                   <div className="mb-4">
                     <div className="d-flex justify-content-between mb-1 small text-muted">
                        <span>Chờ xử lý</span>
                        <span className="fw-bold text-dark">{stats.reports.pending}</span>
                     </div>
                     <div className="progress" style={{ height: '6px' }}>
                        <div className="progress-bar bg-secondary" style={{ width: `${stats.reports.total ? (stats.reports.pending / stats.reports.total) * 100 : 0}%` }}></div>
                     </div>
                   </div>

                   <button 
                     className="btn btn-success w-100 fw-bold mt-auto" 
                     style={{ borderRadius: '10px' }}
                     onClick={() => handleOpenExport('reports')}
                   >
                     <i className="fas fa-file-excel me-2"></i> Xuất Excel Sự Cố
                   </button>
                </div>
             </div>
          </div>

          {/* Card: Bảo trì */}
          <div className="col-12 col-xl-4">
             <div className="card h-100 shadow-sm border-0" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-4 d-flex justify-content-between align-items-center">
                  <h5 className="fw-bold mb-0 text-warning" style={{ color: '#d97706' }}><i className="fas fa-tools me-2"></i>Bảo trì hệ thống</h5>
                  <span className="badge bg-warning bg-opacity-10 text-warning px-3 py-2 rounded-pill fs-6">{stats.activeMaintenance}</span>
                </div>
                <div className="card-body px-4 d-flex flex-column">
                   <div className="text-center my-4 py-2">
                     <div className="display-4 fw-bold" style={{ color: '#d97706' }}>{stats.activeMaintenance}</div>
                     <p className="text-muted mb-0">Công việc bảo trì đang chạy</p>
                   </div>
                   
                   <p className="small text-muted text-center mb-4">
                     Thống kê dựa trên các đợt bảo trì hệ thống và thiết bị theo chu kỳ.
                   </p>

                   <button 
                     className="btn btn-warning text-white w-100 fw-bold mt-auto" 
                     style={{ borderRadius: '10px', backgroundColor: '#d97706', borderColor: '#d97706' }}
                     onClick={() => handleOpenExport('maintenance')}
                   >
                     <i className="fas fa-file-excel me-2"></i> Xuất Excel Bảo Trì
                   </button>
                </div>
             </div>
          </div>

        </div>
      )}

      {/* Export Modal Component */}
      <ExportModal 
        show={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        title={getExportTitle()}
        apiEndpoint={exportType === 'reports' ? '/damage-reports/export' : `/statistics/export`}
        params={{
          ...(exportType !== 'reports' ? { type: exportType } : {}),
          departmentId: departmentId,
          fromDate: fromDate,
          toDate: toDate
        }}
        defaultFileName={`ThongKe_${exportType}`}
      />
    </div>
  );
}
