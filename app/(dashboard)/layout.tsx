'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
        setUser(JSON.parse(userStr));
        if (savedCollapsed === 'true') {
          setSidebarCollapsed(true);
        }
      } catch (error) {
        router.push('/login');
      }
    }
  }, [router]);

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

  const menuItems = [
    { href: '/dashboard', label: 'Trang chủ', icon: 'fas fa-home' },
    { href: '/dashboard/devices', label: 'Thiết bị', icon: 'fas fa-laptop' },
    { href: '/dashboard/departments', label: 'Phòng ban', icon: 'fas fa-building' },
    { href: '/dashboard/device-categories', label: 'Danh mục thiết bị', icon: 'fas fa-box' },
    { href: '/dashboard/staff', label: 'Nhân viên', icon: 'fas fa-users' },
    { href: '/dashboard/events', label: 'Sự kiện', icon: 'fas fa-calendar' },
    { href: '/dashboard/event-types', label: 'Loại sự kiện', icon: 'fas fa-tags' },
  ];

  if (user?.roles?.includes('Admin')) {
    menuItems.push({ href: '/dashboard/admin', label: 'Quản trị', icon: 'fas fa-cog' });
  }

  return (
    <div className="dashboard-wrapper">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)}></div>
      )}
      
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          {!sidebarCollapsed && (
            <h4 className="sidebar-title">HoaGiang Manager</h4>
          )}
          <button className="sidebar-toggle" onClick={toggleSidebar}>
            <i className={`fas ${sidebarCollapsed ? 'fa-angle-right' : 'fa-angle-left'}`}></i>
          </button>
        </div>
        <nav className="sidebar-nav">
          <ul className="sidebar-menu">
            {menuItems.map((item) => (
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
        </nav>
        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <i className="fas fa-user-circle"></i>
              <span>{user?.fullName || user?.email}</span>
            </div>
            <button className="btn btn-outline-light btn-sm w-100" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i> Đăng xuất
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Top Navbar */}
        <nav className="top-navbar">
          <div className="top-navbar-content">
            <button className="sidebar-toggle-mobile" onClick={toggleSidebar}>
              <i className="fas fa-bars"></i>
            </button>
            <div className="top-navbar-right">
              <span className="top-navbar-user">
                <i className="fas fa-user-circle"></i>
                {user?.fullName || user?.email}
              </span>
              <button className="btn btn-outline-primary btn-sm" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt"></i> Đăng xuất
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
  );
}

