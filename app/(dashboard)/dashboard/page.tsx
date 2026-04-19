'use client';

import { useState } from 'react';
import api from '@/lib/utils/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-toastify';

interface MaintenanceNotifications {
  overduePlans: number;
  upcomingPlans: number;
  pendingEvents: number;
}

interface ReportHandler {
  handlerId: number;
  handlerName: string;
  count: number;
}

interface ReportGroup {
  totalCount: number;
  unassignedCount: number;
  handlers: ReportHandler[];
}

interface PendingReportsNotifications {
  pending: ReportGroup;
  inProgress: ReportGroup;
}

import Loading from '@/components/Loading';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  // Fetch notifications with 10s polling
  const { data: notificationsData } = useSWR('/maintenance/notifications', fetcher, {
    refreshInterval: 10000,
    fallbackData: { status: true, data: { overduePlans: 0, upcomingPlans: 0, pendingEvents: 0 } }
  });

  // Fetch pending reports with 10s polling
  const { data: pendingReportsData } = useSWR('/reports/pending', fetcher, {
    refreshInterval: 10000,
    fallbackData: { 
      status: true, 
      data: { 
        pending: { totalCount: 0, unassignedCount: 0, handlers: [] }, 
        inProgress: { totalCount: 0, unassignedCount: 0, handlers: [] } 
      } 
    }
  });

  // Fetch static stats (refreshed every 30s)
  const { data: devicesData } = useSWR('/devices?limit=9999', fetcher, { refreshInterval: 30000 });
  const { data: departmentsData } = useSWR('/departments', fetcher, { refreshInterval: 30000 });
  const { data: staffData } = useSWR('/staff?departmentId=0', fetcher, { refreshInterval: 30000 });
  const { data: eventsData } = useSWR('/events?eventTypeId=0', fetcher, { refreshInterval: 30000 });
  const { data: damageReportsData } = useSWR('/damage-reports', fetcher, { refreshInterval: 30000 });

  const notifications = notificationsData?.data || { overduePlans: 0, upcomingPlans: 0, pendingEvents: 0 };
  const pendingReports = pendingReportsData?.data || {
    pending: { totalCount: 0, unassignedCount: 0, handlers: [] },
    inProgress: { totalCount: 0, unassignedCount: 0, handlers: [] }
  };

    const stats = {
    devices: devicesData?.data?.length || 0,
    departments: departmentsData?.data?.length || 0,
    staff: staffData?.data?.length || 0,
    events: eventsData?.data?.length || 0,
    damageReports: damageReportsData?.data?.length || 0,
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportDailyReport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const response = await api.get('/damage-reports/daily-report', {
        responseType: 'arraybuffer'
      });
      
      const contentType = response.headers['content-type'] || '';
      
      // Check if server returned an error JSON
      if (contentType.includes('application/json')) {
        const text = new TextDecoder('utf-8').decode(response.data);
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || 'Lỗi server');
      }
      
      // Explicitly construct Blob with correct MIME type
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      // Generate safe filename
      const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-'); // dd-mm-yyyy
      const fileName = `Bao_cao_ngay_${dateStr}.xlsx`;
      
      // Use dynamic import specifically to grab the default export correctly
      const fileSaver = await import('file-saver');
      const saveAsObject = fileSaver.default || fileSaver.saveAs || fileSaver;
      saveAsObject(blob, fileName);
      
      toast.success('Đã xuất báo cáo ngày thành công');
    } catch (error: any) {
      console.error('Export failed:', error);
      let errorMsg = 'Lỗi khi xuất báo cáo ngày. Vui lòng thử lại.';
      
      if (error.response?.data && error.response?.headers?.['content-type']?.includes('application/json')) {
          try {
             const text = new TextDecoder('utf-8').decode(error.response.data);
             const errorData = JSON.parse(text);
             errorMsg = errorData.error || errorMsg;
          } catch(e) {}
      } else if (error.message) {
         errorMsg = error.message;
      }
      
      toast.error(errorMsg);
    } finally {
      setIsExporting(false);
    }
  };

  const loading = !devicesData || !notificationsData || !pendingReportsData;

  if (loading) {
    return <Loading fullPage />;
  }


  const hasNotifications = notifications.overduePlans > 0 || notifications.upcomingPlans > 0 || notifications.pendingEvents > 0;
  const hasPendingReports = pendingReports.pending.totalCount > 0 || pendingReports.inProgress.totalCount > 0;

  return (
    <div className="dashboard-page-container">
      {/* Alert Center - Combined Row */}
      {(isAdmin && (hasPendingReports || hasNotifications)) && (
        <div className="alert-center-container">
          <div className="section-heading-compact mb-3">
            <i className="fas fa-bolt text-danger"></i>
            Hệ thống thông báo
          </div>
          <div className="row g-2">
            {/* Pending Reports */}
            {pendingReports.pending.totalCount > 0 && (
              <div className="col-lg-3 col-md-6">
                <Link href="/dashboard/damage-reports?status=Pending" className="alert-item-compact border-left-warning h-100">
                  <i className="fas fa-clock text-warning"></i>
                  <div className="alert-item-text">
                    {pendingReports.pending.totalCount} báo cáo chờ xử lý
                    {pendingReports.pending.unassignedCount > 0 && (
                      <div className="alert-item-sub text-danger fw-bold">
                        {pendingReports.pending.unassignedCount} chưa phân công
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            )}
            {pendingReports.inProgress.totalCount > 0 && (
              <div className="col-lg-3 col-md-6">
                <Link href="/dashboard/damage-reports?status=In Progress" className="alert-item-compact border-left-info h-100">
                  <i className="fas fa-spinner fa-spin text-info"></i>
                  <div className="alert-item-text">
                    {pendingReports.inProgress.totalCount} báo cáo đang xử lý
                  </div>
                </Link>
              </div>
            )}
            {/* Maintenance */}
            {notifications.overduePlans > 0 && (
              <div className="col-lg-3 col-md-6">
                <Link href="/dashboard/maintenance?tab=plans" className="alert-item-compact border-left-danger h-100">
                  <i className="fas fa-calendar-times text-danger"></i>
                  <div className="alert-item-text text-danger">
                    {notifications.overduePlans} bảo trì quá hạn
                  </div>
                </Link>
              </div>
            )}
            {notifications.upcomingPlans > 0 && (
              <div className="col-lg-3 col-md-6">
                <Link href="/dashboard/maintenance?tab=upcoming" className="alert-item-compact border-left-warning h-100">
                  <i className="fas fa-calendar-alt text-warning"></i>
                  <div className="alert-item-text">
                    {notifications.upcomingPlans} bảo trì sắp đến hạn
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid - Extra Compact Tiles */}
      <div className="section-heading-compact">
        <i className="fas fa-chart-bar text-primary"></i>
        Chức năng
      </div>
      <div className="row g-2">
        <div className={isAdmin ? "col-xl-2 col-lg-4 col-md-6" : "col-xl-3 col-sm-6"}>
          <div className="stat-tile-compact" onClick={() => router.push('/dashboard/damage-reports')} style={{ cursor: 'pointer' }}>
            <div className="stat-tile-accent accent-danger"></div>
            <div className="stat-tile-content">
              <div className="stat-tile-title">Báo cáo</div>
              <div className="stat-tile-value">{stats.damageReports}</div>
              <div className="stat-tile-footer text-danger text-decoration-none">Xử lý ngay</div>
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="col-xl-2 col-lg-4 col-md-6">
            <div 
              className={`stat-tile-compact ${isExporting ? 'opacity-50' : ''}`} 
              onClick={handleExportDailyReport} 
              style={{ cursor: isExporting ? 'wait' : 'pointer', border: '1px solid #e2e8f0' }}
            >
              <div className="stat-tile-accent" style={{ backgroundColor: '#2563eb' }}></div>
              <div className="stat-tile-content">
                <div className="stat-tile-title">Báo cáo ngày</div>
                <div className="stat-tile-value">
                  <i className={`fas ${isExporting ? 'fa-spinner fa-spin' : 'fa-file-excel'} text-primary`}></i>
                </div>
                <div className="stat-tile-footer text-primary text-decoration-none">Xuất Excel</div>
              </div>
            </div>
          </div>
        )}
        {isAdmin && (
          <>
            <div className="col-xl-2 col-lg-4 col-md-6">
              <div className="stat-tile-compact" onClick={() => router.push('/dashboard/devices')} style={{ cursor: 'pointer' }}>
                <div className="stat-tile-accent accent-primary"></div>
                <div className="stat-tile-content">
                  <div className="stat-tile-title">Thiết bị</div>
                  <div className="stat-tile-value">{stats.devices}</div>
                  <div className="stat-tile-footer text-primary text-decoration-none">Xem toàn bộ</div>
                </div>
              </div>
            </div>
            <div className="col-xl-2 col-lg-4 col-md-6">
              <div className="stat-tile-compact" onClick={() => router.push('/dashboard/departments')} style={{ cursor: 'pointer' }}>
                <div className="stat-tile-accent accent-success"></div>
                <div className="stat-tile-content">
                  <div className="stat-tile-title">Phòng ban</div>
                  <div className="stat-tile-value">{stats.departments}</div>
                  <div className="stat-tile-footer text-success text-decoration-none">Xem chi tiết</div>
                </div>
              </div>
            </div>
            <div className="col-xl-2 col-lg-4 col-md-6">
              <div className="stat-tile-compact" onClick={() => router.push('/dashboard/staff')} style={{ cursor: 'pointer' }}>
                <div className="stat-tile-accent accent-info"></div>
                <div className="stat-tile-content">
                  <div className="stat-tile-title">Nhân viên</div>
                  <div className="stat-tile-value">{stats.staff}</div>
                  <div className="stat-tile-footer text-info text-decoration-none">Quản lý</div>
                </div>
              </div>
            </div>
            <div className="col-xl-2 col-lg-4 col-md-6">
              <div className="stat-tile-compact" onClick={() => router.push('/dashboard/events')} style={{ cursor: 'pointer' }}>
                <div className="stat-tile-accent accent-warning"></div>
                <div className="stat-tile-content">
                  <div className="stat-tile-title">Sự kiện</div>
                  <div className="stat-tile-value">{stats.events}</div>
                  <div className="stat-tile-footer text-warning text-decoration-none">Lịch biểu</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

