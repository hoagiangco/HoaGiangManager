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
    <div className="container-fluid">
      {/* Pending Reports Notifications */}
      {isAdmin && hasPendingReports && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom">
                <h5 className="mb-0">
                  <i className="fas fa-clipboard-list me-2 text-primary"></i>
                  Báo cáo công việc
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  {pendingReports.pending.totalCount > 0 && (
                    <div className="col-md-6">
                      <div className="alert alert-warning mb-0 d-flex align-items-center" role="alert">
                        <i className="fas fa-clock fa-2x me-3"></i>
                        <div className="flex-grow-1">
                          <strong>{pendingReports.pending.totalCount}</strong> báo cáo công việc <strong>chờ xử lý</strong>
                          {pendingReports.pending.unassignedCount > 0 && (
                            <div className="small mt-1">
                              <span className="badge bg-danger text-white">
                                {pendingReports.pending.unassignedCount} chưa phân công
                              </span>
                            </div>
                          )}
                          {pendingReports.pending.handlers.length > 0 && (
                            <div className="small text-muted mt-1">
                              {pendingReports.pending.handlers.map((handler: ReportHandler, index: number) => (
                                <span key={handler.handlerId}>
                                  {index > 0 && ', '}
                                  <strong>{handler.handlerName}</strong> ({handler.count})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {pendingReports.inProgress.totalCount > 0 && (
                    <div className="col-md-6">
                      <div className="alert alert-info mb-0 d-flex align-items-center" role="alert">
                        <i className="fas fa-spinner fa-2x me-3"></i>
                        <div className="flex-grow-1">
                          <strong>{pendingReports.inProgress.totalCount}</strong> báo cáo công việc <strong>đang xử lý</strong>
                          {pendingReports.inProgress.unassignedCount > 0 && (
                            <div className="small mt-1">
                              <span className="badge bg-danger text-white">
                                {pendingReports.inProgress.unassignedCount} chưa phân công
                              </span>
                            </div>
                          )}
                          {pendingReports.inProgress.handlers.length > 0 && (
                            <div className="small text-muted mt-1">
                              {pendingReports.inProgress.handlers.map((handler: ReportHandler, index: number) => (
                                <span key={handler.handlerId}>
                                  {index > 0 && ', '}
                                  <strong>{handler.handlerName}</strong> ({handler.count})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Notifications */}
      {isAdmin && hasNotifications && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-bottom">
                <h5 className="mb-0">
                  <i className="fas fa-bell me-2 text-warning"></i>
                  Thông báo bảo trì
                </h5>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  {notifications.overduePlans > 0 && (
                    <div className="col-md-4">
                      <div className="alert alert-danger mb-0 d-flex align-items-center" role="alert">
                        <i className="fas fa-exclamation-triangle fa-2x me-3"></i>
                        <div className="flex-grow-1">
                          <strong>{notifications.overduePlans}</strong> kế hoạch bảo trì <strong>quá hạn</strong>
                          <div className="mt-1">
                            <Link href="/dashboard/maintenance?tab=plans" className="alert-link">
                              Xem chi tiết →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {notifications.upcomingPlans > 0 && (
                    <div className="col-md-4">
                      <div className="alert alert-warning mb-0 d-flex align-items-center" role="alert">
                        <i className="fas fa-clock fa-2x me-3"></i>
                        <div className="flex-grow-1">
                          <strong>{notifications.upcomingPlans}</strong> kế hoạch bảo trì <strong>sắp đến hạn</strong> (7 ngày tới)
                          <div className="mt-1">
                            <Link href="/dashboard/maintenance?tab=upcoming" className="alert-link">
                              Xem chi tiết →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {notifications.pendingEvents > 0 && (
                    <div className="col-md-4">
                      <div className="alert alert-info mb-0 d-flex align-items-center" role="alert">
                        <i className="fas fa-tasks fa-2x me-3"></i>
                        <div className="flex-grow-1">
                          <strong>{notifications.pendingEvents}</strong> sự kiện bảo trì <strong>cần xử lý</strong>
                          <div className="mt-1">
                            <Link href="/dashboard/maintenance?tab=upcoming" className="alert-link">
                              Xem chi tiết →
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="row">
        {isAdmin && (
          <>
            <div className="col-md-3 mb-4">
              <div className="card text-white bg-primary">
                <div 
                  className="card-body dashboard-card-body" 
                  onClick={() => router.push('/dashboard/devices')}
                  style={{ cursor: 'pointer' }}
                >
                  <h5 className="card-title">Thiết bị</h5>
                  <h2>{stats.devices}</h2>
                  <Link href="/dashboard/devices" className="text-white" onClick={(e) => e.stopPropagation()}>
                    Xem chi tiết →
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-4">
              <div className="card text-white bg-success">
                <div 
                  className="card-body dashboard-card-body" 
                  onClick={() => router.push('/dashboard/departments')}
                  style={{ cursor: 'pointer' }}
                >
                  <h5 className="card-title">Phòng ban</h5>
                  <h2>{stats.departments}</h2>
                  <Link href="/dashboard/departments" className="text-white" onClick={(e) => e.stopPropagation()}>
                    Xem chi tiết →
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-4">
              <div className="card text-white bg-info">
                <div 
                  className="card-body dashboard-card-body" 
                  onClick={() => router.push('/dashboard/staff')}
                  style={{ cursor: 'pointer' }}
                >
                  <h5 className="card-title">Nhân viên</h5>
                  <h2>{stats.staff}</h2>
                  <Link href="/dashboard/staff" className="text-white" onClick={(e) => e.stopPropagation()}>
                    Xem chi tiết →
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-md-3 mb-4">
              <div className="card text-white bg-warning">
                <div 
                  className="card-body dashboard-card-body" 
                  onClick={() => router.push('/dashboard/events')}
                  style={{ cursor: 'pointer' }}
                >
                  <h5 className="card-title">Sự kiện</h5>
                  <h2>{stats.events}</h2>
                  <Link href="/dashboard/events" className="text-white" onClick={(e) => e.stopPropagation()}>
                    Xem chi tiết →
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
        <div className="col-md-3 mb-4">
          <div className="card text-white bg-danger">
            <div 
              className="card-body dashboard-card-body" 
              onClick={() => router.push('/dashboard/damage-reports')}
              style={{ cursor: 'pointer' }}
            >
              <h5 className="card-title">Báo cáo</h5>
              <h2>{stats.damageReports}</h2>
              <Link href="/dashboard/damage-reports" className="text-white" onClick={(e) => e.stopPropagation()}>
                Xem chi tiết →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

