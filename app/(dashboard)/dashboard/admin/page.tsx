"use client";

import React, { useEffect, useMemo, useState } from 'react';
import AdminRoute from '@/components/AdminRoute';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { useAuth } from '@/lib/contexts/AuthContext';
import { formatDateTime } from '@/lib/utils/dateFormat';

interface UserVM {
  id: string;
  userName: string;
  email: string;
  createdDate?: string;
  roles: string[];
  lockoutEnabled?: boolean;
  lockoutEnd?: string | null;
  isLocked?: boolean;
}

interface RoleItem { id: string; name: string }

function AdminUsersPageContent() {
  const [users, setUsers] = useState<UserVM[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserVM | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordUser, setPasswordUser] = useState<UserVM | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadData();
    loadRoles();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      if (res.data.status) {
        setUsers(res.data.data || []);
      }
    } catch (e: any) {
      toast.error('Lỗi khi tải danh sách user');
    } finally {
      setLoading(false);
      setCurrentPage(1);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await api.get('/users/roles');
      if (res.data.status) {
        setRoles(res.data.data || []);
      }
    } catch (e) {
      // ignore
    }
  };

  const openRolesModal = (user: UserVM) => {
    setSelectedUser(user);
    
    // Determine effective single role from legacy multiple roles
    let initialRole = 'User';
    if (user.roles && user.roles.length > 0) {
      if (user.roles.includes('SuperAdmin')) initialRole = 'SuperAdmin';
      else if (user.roles.includes('Admin')) initialRole = 'Admin';
      else if (user.roles.includes('Supervisor')) initialRole = 'Supervisor';
      else initialRole = user.roles[0];
    }
    
    setSelectedRoles([initialRole]);
    setShowRolesModal(true);
  };

  const toggleRole = (role: string) => {
    setSelectedRoles([role]); // Single role enforcement
  };

  const saveRoles = async () => {
    if (!selectedUser) return;
    try {
      await api.put(`/users/${selectedUser.id}`, { id: selectedUser.id, roles: selectedRoles });
      toast.success('Cập nhật quyền thành công');
      setShowRolesModal(false);
      setSelectedUser(null);
      loadData();
    } catch (e: any) {
      toast.error('Lỗi khi cập nhật quyền');
    }
  };

  const openChangePasswordModal = (user: UserVM) => {
    setPasswordUser(user);
    setNewPassword('');
    setConfirmPassword('');
    setShowChangePasswordModal(true);
  };

  const handleChangePassword = async () => {
    if (!passwordUser) return;

    if (!newPassword || !confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      await api.put(`/users/${passwordUser.id}/change-password`, { newPassword });
      toast.success('Đổi mật khẩu thành công');
      setShowChangePasswordModal(false);
      setPasswordUser(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi đổi mật khẩu');
    }
  };

  const handleToggleLock = async (user: UserVM) => {
    if (!user) return;
    if (currentUser?.id === user.id) {
      toast.error('Không thể khóa hoặc mở khóa chính tài khoản của bạn');
      return;
    }

    const locked = !user.isLocked;
    const confirmMessage = locked
      ? `Khóa tài khoản ${user.email}? Người dùng sẽ không thể đăng nhập cho tới khi được mở khóa.`
      : `Mở khóa tài khoản ${user.email}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await api.put(`/users/${user.id}/lock`, { locked });
      toast.success(locked ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi khi cập nhật trạng thái tài khoản');
    }
  };

  const handleDeleteUser = async (user: UserVM) => {
    if (!user) return;
    if (currentUser?.id === user.id) {
      toast.error('Không thể xóa chính tài khoản của bạn');
      return;
    }

    if (!window.confirm(`Bạn chắc chắn muốn xóa tài khoản ${user.email}?`)) {
      return;
    }

    try {
      await api.delete(`/users/${user.id}`);
      toast.success('Đã xóa tài khoản');
      loadData();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Lỗi khi xóa tài khoản');
    }
  };

  const totalPages = useMemo(() => {
    if (users.length === 0) return 1;
    return Math.max(1, Math.ceil(users.length / pageSize));
  }, [users.length]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return users.slice(startIndex, startIndex + pageSize);
  }, [users, currentPage]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const renderStatusBadge = (user: UserVM) => {
    if (user.isLocked) {
      return <span className="badge bg-danger">Đã khóa</span>;
    }
    return <span className="badge bg-success">Hoạt động</span>;
  };

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

  return (
    <div className="container-fluid">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Quản lý người dùng</h5>
          <button className="btn btn-outline-secondary btn-sm" onClick={loadData} title="Tải lại">
            <i className="fas fa-rotate"></i>
          </button>
        </div>
        <div className="card-body p-0">
          <style dangerouslySetInnerHTML={{ __html: `
            .btn-tiny {
              padding: 0.15rem 0.35rem;
              font-size: 0.7rem;
              line-height: 1;
              border-radius: 0.2rem;
            }
            .user-mobile-item {
              transition: background-color 0.15s;
            }
            .user-mobile-item:active {
              background-color: #f8f9fa;
            }
          `}} />

          <div className="table-responsive d-none d-md-block">
            <table className="table table-striped table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Email</th>
                  <th>Quyền</th>
                  <th>Ngày tạo</th>
                  <th>Trạng thái</th>
                  <th style={{ width: '220px' }} className="text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-4 text-muted">Không có user</td>
                  </tr>
                ) : paginatedUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>
                      {u.roles && u.roles.length > 0 ? (
                        <div className="d-flex flex-wrap gap-1">
                          {u.roles.map(r => (
                            <span key={r} className="badge bg-light text-dark border">{r}</span>
                          ))}
                        </div>
                      ) : <span className="text-muted small">(none)</span>}
                    </td>
                    <td><small>{formatDateTime(u.createdDate) || '-'}</small></td>
                    <td>{renderStatusBadge(u)}</td>
                    <td>
                      <div className="d-flex gap-1 justify-content-center">
                        <button 
                          className="btn btn-sm btn-primary" 
                          onClick={() => openRolesModal(u)} 
                          title="Gán quyền"
                          disabled={u.roles?.includes('SuperAdmin') && currentUser?.id !== u.id}
                        >
                          <i className="fas fa-user-shield"></i>
                        </button>
                        <button 
                          className="btn btn-sm btn-warning" 
                          onClick={() => openChangePasswordModal(u)} 
                          title="Đổi mật khẩu"
                          disabled={u.roles?.includes('SuperAdmin') && currentUser?.id !== u.id}
                        >
                          <i className="fas fa-key"></i>
                        </button>
                        <button
                          className={`btn btn-sm ${u.isLocked ? 'btn-success' : 'btn-outline-secondary'}`}
                          onClick={() => handleToggleLock(u)}
                          title={u.isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          disabled={currentUser?.id === u.id || u.roles?.includes('SuperAdmin')}
                        >
                          <i className={`fas ${u.isLocked ? 'fa-lock-open' : 'fa-lock'}`}></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteUser(u)}
                          title="Xóa tài khoản"
                          disabled={currentUser?.id === u.id || u.roles?.includes('SuperAdmin')}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-md-none">
            {users.length === 0 ? (
              <div className="text-center py-4 text-muted border-top">Không có user</div>
            ) : paginatedUsers.map(u => (
              <div key={u.id} className="p-2 border-bottom user-mobile-item">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="fw-bold text-primary text-truncate small" style={{ maxWidth: '70%', fontSize: '0.85rem' }}>
                    {u.email}
                  </div>
                  <div style={{ transform: 'scale(0.85)', transformOrigin: 'right center' }}>
                    {renderStatusBadge(u)}
                  </div>
                </div>
                
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex flex-wrap gap-1 align-items-center">
                    {u.roles && u.roles.length > 0 ? u.roles.map(r => (
                      <span key={r} className="badge bg-light text-dark border p-1" style={{ fontSize: '0.65rem' }}>{r}</span>
                    )) : <span className="text-muted" style={{ fontSize: '0.65rem' }}>Chưa gán quyền</span>}
                  </div>

                  <div className="d-flex gap-1 align-items-center ps-2 border-start ms-2">
                    <button 
                      className="btn btn-primary btn-tiny" 
                      onClick={() => openRolesModal(u)} 
                      title="Gán quyền"
                      disabled={u.roles?.includes('SuperAdmin') && currentUser?.id !== u.id}
                    >
                      <i className="fas fa-user-shield"></i>
                    </button>
                    <button 
                      className="btn btn-warning btn-tiny" 
                      onClick={() => openChangePasswordModal(u)} 
                      title="Đổi mật khẩu"
                      disabled={u.roles?.includes('SuperAdmin') && currentUser?.id !== u.id}
                    >
                      <i className="fas fa-key"></i>
                    </button>
                    <button
                      className={`btn ${u.isLocked ? 'btn-success' : 'btn-outline-secondary'} btn-tiny`}
                      onClick={() => handleToggleLock(u)}
                      title={u.isLocked ? 'Mở khóa' : 'Khóa'}
                      disabled={currentUser?.id === u.id || u.roles?.includes('SuperAdmin')}
                    >
                      <i className={`fas ${u.isLocked ? 'fa-lock-open' : 'fa-lock'}`}></i>
                    </button>
                    <button
                      className="btn btn-danger btn-tiny"
                      onClick={() => handleDeleteUser(u)}
                      disabled={currentUser?.id === u.id || u.roles?.includes('SuperAdmin')}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div className="text-muted mt-1" style={{ fontSize: '0.65rem' }}>
                  <i className="far fa-clock me-1"></i>
                  {formatDateTime(u.createdDate) || 'N/A'}
                </div>
              </div>
            ))}
          </div>

          {users.length > 0 && (
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-center p-2 gap-2 border-top bg-light-subtle">
              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                <strong>{paginatedUsers.length}</strong> / <strong>{users.length}</strong> user
              </div>
              <nav aria-label="Page navigation">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" style={{ padding: '0.2rem 0.4rem' }} onClick={() => handlePageChange(currentPage - 1)}>
                      <i className="fas fa-angle-left"></i>
                    </button>
                  </li>
                  
                  {(() => {
                    let pages = [];
                    if (totalPages <= 5) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      if (currentPage <= 3) pages = [1, 2, 3, 4, totalPages];
                      else if (currentPage >= totalPages - 2) pages = [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                      else pages = [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
                    }
                    
                    return pages.map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && page - array[index-1] > 1 && (
                          <li className="page-item disabled"><span className="page-link" style={{ padding: '0.2rem 0.4rem' }}>...</span></li>
                        )}
                        <li className={`page-item ${currentPage === page ? 'active' : ''}`}>
                          <button className="page-link" style={{ padding: '0.2rem 0.4rem' }} onClick={() => handlePageChange(page)}>{page}</button>
                        </li>
                      </React.Fragment>
                    ));
                  })()}

                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" style={{ padding: '0.2rem 0.4rem' }} onClick={() => handlePageChange(currentPage + 1)}>
                      <i className="fas fa-angle-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {showRolesModal && selectedUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Cài quyền cho {selectedUser.email}</h5>
                <button type="button" className="btn-close" onClick={() => setShowRolesModal(false)}></button>
              </div>
              <div className="modal-body">
                {roles.length === 0 ? (
                  <div className="text-muted">Không có role nào</div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {roles.filter(r => {
                      if (r.name === 'SuperAdmin') {
                        // Only show SuperAdmin option if current user is SuperAdmin
                        return currentUser?.roles?.includes('SuperAdmin');
                      }
                      return true;
                    }).map(r => (
                      <div key={r.id} className="form-check border rounded p-3 mb-2 bg-light d-flex align-items-start">
                        <input
                          type="radio"
                          name="roleSelection"
                          id={`role-${r.id}`}
                          className="form-check-input mt-1 me-2"
                          checked={selectedRoles.includes(r.name)}
                          onChange={() => toggleRole(r.name)}
                          disabled={r.name === 'SuperAdmin' && selectedUser.roles?.includes('SuperAdmin')}
                          style={{ cursor: 'pointer' }}
                        />
                        <label className="form-check-label w-100 m-0" htmlFor={`role-${r.id}`} style={{ cursor: 'pointer' }}>
                          <div className="fw-bold">{r.name}</div>
                          <div className="text-muted small mt-1">
                            {r.name === 'SuperAdmin' && 'Toàn quyền hệ thống'}
                            {r.name === 'Admin' && 'Quản lý đầy đủ (thiết bị, báo cáo, nhân sự...)'}
                            {r.name === 'Supervisor' && 'Nhân viên + Được quyền xem toàn bộ báo cáo/bảo trì của công ty'}
                            {r.name === 'User' && 'Nhân viên thông thường (tạo báo cáo, thực hiện bảo trì được giao)'}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRolesModal(false)}>Đóng</button>
                <button className="btn btn-primary" onClick={saveRoles}>Lưu</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showChangePasswordModal && passwordUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Đổi mật khẩu cho {passwordUser.email}</h5>
                <button type="button" className="btn-close" onClick={() => setShowChangePasswordModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Mật khẩu mới <span className="text-danger">*</span></label>
                  <input
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                    minLength={6}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Xác nhận mật khẩu <span className="text-danger">*</span></label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleChangePassword();
                      }
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowChangePasswordModal(false)}>Hủy</button>
                <button className="btn btn-warning" onClick={handleChangePassword}>
                  <i className="fas fa-key me-2"></i>Đổi mật khẩu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <AdminRoute>
      <AdminUsersPageContent />
    </AdminRoute>
  );
}
