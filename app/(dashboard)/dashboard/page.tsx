'use client';

import { useState } from 'react';
import api from '@/lib/utils/api';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

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

  const loading = !devicesData || !notificationsData || !pendingReportsData;

  if (loading) {
    return <div className="text-center">Đang tải...</div>;
  }

  const hasNotifications = notifications.overduePlans > 0 || notifications.upcomingPlans > 0 || notifications.pendingEvents > 0;
  const hasPendingReports = pendingReports.pending.totalCount > 0 || pendingReports.inProgress.totalCount > 0;

  return (
    <div className="container-fluid py-4">
      {/* Pending Reports Section */}
      {isAdmin && hasPendingReports && (
        <div className="mb-5">
          <h5 className="dashboard-section-title">
            <i className="fas fa-clipboard-list text-accent-primary"></i>
            Báo cáo công việc cần xử lý
          </h5>
          <div className="row g-3">
            {pendingReports.pending.totalCount > 0 && (
              <div className="col-lg-6">
                <div className="alert-compact-modern alert-warning border-warning-subtle shadow-sm">
                  <i className="fas fa-clock text-warning"></i>
                  <div className="alert-compact-content">
                    <div className="alert-compact-title">
                      {pendingReports.pending.totalCount} báo cáo chờ xử lý
                      {pendingReports.pending.unassignedCount > 0 && (
                        <span className="badge bg-danger ms-2">
                          {pendingReports.pending.unassignedCount} chưa phân công
                        </span>
                      )}
                    </div>
                    {pendingReports.pending.handlers.length > 0 && (
                      <div className="small text-muted mt-1">
                        {pendingReports.pending.handlers.slice(0, 3).map((h: ReportHandler, i: number) => (
                          <span key={h.handlerId}>{i > 0 && ', '}<strong>{h.handlerName}</strong> ({h.count})</span>
                        ))}
                        {pendingReports.pending.handlers.length > 3 && '...'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {pendingReports.inProgress.totalCount > 0 && (
              <div className="col-lg-6">
                <div className="alert-compact-modern alert-info border-info-subtle shadow-sm">
                  <i className="fas fa-spinner fa-spin text-info"></i>
                  <div className="alert-compact-content">
                    <div className="alert-compact-title">{pendingReports.inProgress.totalCount} báo cáo đang xử lý</div>
                    {pendingReports.inProgress.handlers.length > 0 && (
                      <div className="small text-muted mt-1">
                        {pendingReports.inProgress.handlers.slice(0, 3).map((h: ReportHandler, i: number) => (
                          <span key={h.handlerId}>{i > 0 && ', '}<strong>{h.handlerName}</strong> ({h.count})</span>
                        ))}
                        {pendingReports.inProgress.handlers.length > 3 && '...'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Maintenance Notifications Section */}
      {isAdmin && hasNotifications && (
        <div className="mb-5">
          <h5 className="dashboard-section-title">
            <i className="fas fa-bell text-accent-warning"></i>
            Thông báo bảo trì hệ thống
          </h5>
          <div className="row g-3">
            {notifications.overduePlans > 0 && (
              <div className="col-md-4">
                <div className="alert-compact-modern alert-danger border-danger-subtle shadow-sm">
                  <i className="fas fa-exclamation-triangle text-danger"></i>
                  <div className="alert-compact-content">
                    <div className="alert-compact-title text-danger">{notifications.overduePlans} kế hoạch quá hạn</div>
                    <Link href="/dashboard/maintenance?tab=plans" className="small fw-bold text-danger text-decoration-none">Xem chi tiết →</Link>
                  </div>
                </div>
              </div>
            )}
            {notifications.upcomingPlans > 0 && (
              <div className="col-md-4">
                <div className="alert-compact-modern alert-warning border-warning-subtle shadow-sm">
                  <i className="fas fa-clock text-warning"></i>
                  <div className="alert-compact-content">
                    <div className="alert-compact-title">{notifications.upcomingPlans} kế hoạch sắp đến hạn</div>
                    <Link href="/dashboard/maintenance?tab=upcoming" className="small fw-bold text-warning-emphasis text-decoration-none">Xem chi tiết →</Link>
                  </div>
                </div>
              </div>
            )}
            {notifications.pendingEvents > 0 && (
              <div className="col-md-4">
                <div className="alert-compact-modern alert-info border-info-subtle shadow-sm">
                  <i className="fas fa-tasks text-info"></i>
                  <div className="alert-compact-content">
                    <div className="alert-compact-title">{notifications.pendingEvents} sự kiện cần xử lý</div>
                    <Link href="/dashboard/maintenance?tab=upcoming" className="small fw-bold text-info-emphasis text-decoration-none">Xem chi tiết →</Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Tiles Section */}
      <h5 className="dashboard-section-title">
        <i className="fas fa-chart-pie text-accent-success"></i>
        Tổng quan tài sản & nhân sự
      </h5>
      <div className="row g-4 transition-fade">
        {isAdmin && (
          <>
            <div className="col-xl-3 col-sm-6">
              <div className="stat-tile-modern border-accent-primary" onClick={() => router.push('/dashboard/devices')} style={{ cursor: 'pointer' }}>
                <div className="stat-tile-body">
                  <div className="stat-tile-title">THIẾT BỊ</div>
                  <div className="stat-tile-value">{stats.devices}</div>
                  <Link href="/dashboard/devices" className="stat-tile-link text-accent-primary" onClick={(e) => e.stopPropagation()}>
                    Xem chi tiết <i className="fas fa-chevron-right small"></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6">
              <div className="stat-tile-modern border-accent-success" onClick={() => router.push('/dashboard/departments')} style={{ cursor: 'pointer' }}>
                <div className="stat-tile-body">
                  <div className="stat-tile-title">PHÒNG BAN</div>
                  <div className="stat-tile-value">{stats.departments}</div>
                  <Link href="/dashboard/departments" className="stat-tile-link text-accent-success" onClick={(e) => e.stopPropagation()}>
                    Xem chi tiết <i className="fas fa-chevron-right small"></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6">
              <div className="stat-tile-modern border-accent-info" onClick={() => router.push('/dashboard/staff')} style={{ cursor: 'pointer' }}>
                <div className="stat-tile-body">
                  <div className="stat-tile-title">NHÂN VIÊN</div>
                  <div className="stat-tile-value">{stats.staff}</div>
                  <Link href="/dashboard/staff" className="stat-tile-link text-accent-info" onClick={(e) => e.stopPropagation()}>
                    Xem chi tiết <i className="fas fa-chevron-right small"></i>
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6">
              <div className="stat-tile-modern border-accent-warning" onClick={() => router.push('/dashboard/events')} style={{ cursor: 'pointer' }}>
                <div className="stat-tile-body">
                  <div className="stat-tile-title">SỰ KIỆN</div>
                  <div className="stat-tile-value">{stats.events}</div>
                  <Link href="/dashboard/events" className="stat-tile-link text-accent-warning" onClick={(e) => e.stopPropagation()}>
                    Xem chi tiết <i className="fas fa-chevron-right small"></i>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
        <div className="col-xl-3 col-sm-6">
          <div className="stat-tile-modern border-accent-danger" onClick={() => router.push('/dashboard/damage-reports')} style={{ cursor: 'pointer' }}>
            <div className="stat-tile-body">
              <div className="stat-tile-title">BÁO CÁO CÔNG VIỆC</div>
              <div className="stat-tile-value">{stats.damageReports}</div>
              <Link href="/dashboard/damage-reports" className="stat-tile-link text-accent-danger" onClick={(e) => e.stopPropagation()}>
                Xem chi tiết <i className="fas fa-chevron-right small"></i>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

