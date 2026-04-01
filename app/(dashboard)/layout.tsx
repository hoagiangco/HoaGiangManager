'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import api from '@/lib/utils/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [staffName, setStaffName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const savedCollapsed = localStorage.getItem('sidebarCollapsed');
      
      if (!token || !userStr) {
        router.push('/login');
        return;
      }

      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        if (savedCollapsed === 'true') {
          setSidebarCollapsed(true);
        }
        // Load staff name
        loadStaffName(userData);
      } catch (error) {
        router.push('/login');
      }
    }
  }, [router]);

  const loadStaffName = async (userData: any) => {
    try {
      if (!userData?.userId && !userData?.id && !userData?.fid && !userData?.email) return;
      
      const response = await api.get('/staff?departmentId=0');
      if (response.data.status && response.data.data) {
        const staff = response.data.data;
        
        // Try to find staff by userId/id/fid
        const possibleUserIds: string[] = [];
        if (userData.userId) possibleUserIds.push(String(userData.userId));
        if (userData.id) possibleUserIds.push(String(userData.id));
        if (userData.fid) possibleUserIds.push(String(userData.fid));
        
        let foundStaff = staff.find((s: any) => 
          s.userId && possibleUserIds.some(uid => uid && s.userId === uid)
        );
        
        // Fallback to email match
        if (!foundStaff && userData.email) {
          const userEmail = String(userData.email).trim().toLowerCase();
          foundStaff = staff.find((s: any) => 
            (s.email || '').trim().toLowerCase() === userEmail
          );
        }
        
        if (foundStaff) {
          setStaffName(foundStaff.name);
        }
      }
    } catch (error) {
      console.error('Error loading staff name:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      const newState = !sidebarCollapsed;
      setSidebarCollapsed(newState);
      localStorage.setItem('sidebarCollapsed', String(newState));
    }
  };

  // Menu items based on role
  const isAdmin = user?.roles?.includes('Admin');
  
  const menuGroups = [];
  
  if (isAdmin) {
    // Admin sees all menu items grouped
    menuGroups.push(
      {
        title: 'Tổng quan',
        items: [
          { href: '/dashboard', label: 'Trang chủ', icon: 'fas fa-home' }
        ]
      },
      {
        title: 'Quản lý tài sản',
        items: [
          { href: '/dashboard/devices', label: 'Thiết bị', icon: 'fas fa-laptop' },
          { href: '/dashboard/device-categories', label: 'Danh mục thiết bị', icon: 'fas fa-box' },
          { href: '/dashboard/departments', label: 'Phòng ban', icon: 'fas fa-building' }
        ]
      },
      {
        title: 'Hoạt động',
        items: [
          { href: '/dashboard/damage-reports', label: 'Báo cáo công việc', icon: 'fas fa-exclamation-triangle' },
          { href: '/dashboard/maintenance', label: 'Bảo trì', icon: 'fas fa-wrench' },
          { href: '/dashboard/events', label: 'Sự kiện', icon: 'fas fa-calendar' },
          { href: '/dashboard/event-types', label: 'Loại sự kiện', icon: 'fas fa-tags' }
        ]
      },
      {
        title: 'Hệ thống',
        items: [
          { href: '/dashboard/staff', label: 'Nhân viên', icon: 'fas fa-users' },
          { href: '/dashboard/admin', label: 'Quản trị', icon: 'fas fa-cog' }
        ]
      }
    );
  } else {
    // User only sees limited items grouped
    menuGroups.push(
      {
        title: 'Tổng quan',
        items: [
          { href: '/dashboard', label: 'Trang chủ', icon: 'fas fa-home' }
        ]
      },
      {
        title: 'Hoạt động',
        items: [
          { href: '/dashboard/damage-reports', label: 'Báo cáo công việc', icon: 'fas fa-exclamation-triangle' }
        ]
      }
    );
  }

  return (
    <AuthProvider>
      <div className="dashboard-wrapper">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>
      )}
      
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header d-flex justify-content-center align-items-center position-relative">
          {!sidebarCollapsed && (
            <h4 className="sidebar-title m-0 text-center">
              <span className="d-none d-md-inline">HoaGiang Manager</span>
              <span className="d-md-none">HG Manager</span>
            </h4>
          )}
          <button className="sidebar-toggle position-absolute end-0 me-2" onClick={toggleSidebar}>
            <i className={`fas ${sidebarCollapsed ? 'fa-angle-right' : 'fa-angle-left'}`}></i>
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="sidebar-menu-group">
              {!sidebarCollapsed && <div className="sidebar-menu-title">{group.title}</div>}
              <ul className="sidebar-menu">
                {group.items.map((item) => (
                  <li key={item.href} className="sidebar-menu-item">
                    <Link
                      href={item.href}
                      className={`sidebar-menu-link ${pathname === item.href ? 'active' : ''}`}
                      title={sidebarCollapsed ? item.label : ''}
                      onClick={() => {
                        if (window.innerWidth <= 768) {
                          setMobileMenuOpen(false);
                        }
                      }}
                    >
                      <i className={item.icon}></i>
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        {(!sidebarCollapsed || mobileMenuOpen) && (
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <i className="fas fa-user-circle"></i>
              <span>{user?.fullName || user?.email}</span>
            </div>
            <button className="btn btn-outline-light btn-sm w-100" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Đăng xuất
            </button>
            <div className="copyright-notice">
              Copy right by LeeKhiem
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Top Navbar */}
        <nav className="top-navbar">
          <div className="top-navbar-content">
            <div className="top-navbar-left d-flex align-items-center gap-3">
              <button className="sidebar-toggle-mobile" onClick={toggleSidebar}>
                <i className="fas fa-bars"></i>
              </button>
              <span 
                className="top-navbar-user d-flex align-items-center gap-2"
                title={staffName || user?.fullName || user?.email}
                aria-label={staffName || user?.fullName || user?.email}
              >
                <i className="fas fa-user-circle"></i>
                <span>{staffName || user?.fullName || user?.email || 'Account'}</span>
              </span>
            </div>
            <div className="top-navbar-right ms-auto">
              <button 
                className="btn btn-outline-primary btn-sm" 
                onClick={handleLogout}
                title="Đăng xuất"
                aria-label="Đăng xuất"
              >
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="page-content">
          {children}
        </main>
      </div>

      <ToastContainer position="bottom-right" />
      </div>
    </AuthProvider>
  );
}

