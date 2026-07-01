'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { toast } from 'react-toastify';

interface SuperAdminRouteProps {
  children: React.ReactNode;
}

export default function SuperAdminRoute({ children }: SuperAdminRouteProps) {
  const { user, hasRole, loading } = useAuth();
  const router = useRouter();
  const isSuperAdmin = hasRole('SuperAdmin');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast.error('Vui lòng đăng nhập');
        router.push('/login');
      } else if (!isSuperAdmin) {
        toast.error('Chức năng này chỉ dành cho SuperAdmin');
        router.push('/dashboard/damage-reports');
      }
    }
  }, [user, isSuperAdmin, loading, router]);

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="card">
          <div className="card-body text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isSuperAdmin) {
    return null;
  }

  return <>{children}</>;
}
