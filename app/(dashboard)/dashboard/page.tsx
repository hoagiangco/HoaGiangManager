'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/utils/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    devices: 0,
    departments: 0,
    staff: 0,
    events: 0,
    damageReports: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [devicesRes, departmentsRes, staffRes, eventsRes, damageReportsRes] = await Promise.all([
          api.get('/devices?cateId=0'),
          api.get('/departments'),
          api.get('/staff?departmentId=0'),
          api.get('/events?eventTypeId=0'),
          api.get('/damage-reports'),
        ]);

        setStats({
          devices: devicesRes.data.data?.length || 0,
          departments: departmentsRes.data.data?.length || 0,
          staff: staffRes.data.data?.length || 0,
          events: eventsRes.data.data?.length || 0,
          damageReports: damageReportsRes.data.data?.length || 0,
        });
      } catch (error: any) {
        console.error('Error fetching stats:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Lỗi khi tải thống kê';
        console.error('Error details:', errorMessage);
        // Set stats to 0 on error instead of keeping previous values
        setStats({
          devices: 0,
          departments: 0,
          staff: 0,
          events: 0,
          damageReports: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-center">Đang tải...</div>;
  }

  return (
    <div className="container-fluid">
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
              <h5 className="card-title">Báo cáo hư hỏng</h5>
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

