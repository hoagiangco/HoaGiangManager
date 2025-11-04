'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/utils/api';
import Link from 'next/link';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    devices: 0,
    departments: 0,
    staff: 0,
    events: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [devicesRes, departmentsRes, staffRes, eventsRes] = await Promise.all([
          api.get('/devices?cateId=0'),
          api.get('/departments'),
          api.get('/staff?departmentId=0'),
          api.get('/events?eventTypeId=0'),
        ]);

        setStats({
          devices: devicesRes.data.data?.length || 0,
          departments: departmentsRes.data.data?.length || 0,
          staff: staffRes.data.data?.length || 0,
          events: eventsRes.data.data?.length || 0,
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
      <h1 className="mb-4">Trang chủ</h1>
      <div className="row">
        <div className="col-md-3 mb-4">
          <div className="card text-white bg-primary">
            <div className="card-body">
              <h5 className="card-title">Thiết bị</h5>
              <h2>{stats.devices}</h2>
              <Link href="/dashboard/devices" className="text-white">
                Xem chi tiết →
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div className="card text-white bg-success">
            <div className="card-body">
              <h5 className="card-title">Phòng ban</h5>
              <h2>{stats.departments}</h2>
              <Link href="/dashboard/departments" className="text-white">
                Xem chi tiết →
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div className="card text-white bg-info">
            <div className="card-body">
              <h5 className="card-title">Nhân viên</h5>
              <h2>{stats.staff}</h2>
              <Link href="/dashboard/staff" className="text-white">
                Xem chi tiết →
              </Link>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-4">
          <div className="card text-white bg-warning">
            <div className="card-body">
              <h5 className="card-title">Sự kiện</h5>
              <h2>{stats.events}</h2>
              <Link href="/dashboard/events" className="text-white">
                Xem chi tiết →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

