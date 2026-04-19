'use client';

import React, { useState, useEffect } from 'react';
import { DamageReportVM, DamageReportStatus, DamageReportPriority } from '@/types';
import { formatDateDisplay } from '@/lib/utils/dateFormat';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import FileManager from '@/components/FileManager';
import { isAdmin } from '@/lib/auth/permissions';

interface QuickViewReportModalProps {
  reportId: number;
  isOpen: boolean;
  onClose: () => void;
  onViewImages?: (images: string[], index: number) => void;
  onUpdate?: () => void;
}

const QuickViewReportModal: React.FC<QuickViewReportModalProps> = ({
  reportId,
  isOpen,
  onClose,
  onViewImages,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DamageReportVM | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [showFileManager, setShowFileManager] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    }
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const res = await api.get('/staff');
      if (res.data.status) {
        setStaff(res.data.data || []);
      }
    } catch (e) {
      console.error('Error loading staff in modal:', e);
    }
  };

  const getCurrentUserStaffId = () => {
    if (!currentUser || staff.length === 0) return null;
    const me = staff.find(s => s.userId === currentUser.userId || s.userId === currentUser.id);
    return me ? me.id : null;
  };

  useEffect(() => {
    if (isOpen && reportId) {
      loadReport();
    } else {
      setReport(null);
    }
  }, [isOpen, reportId]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/damage-reports/${reportId}`);
      if (res.data.status) {
        const reportData = res.data.data as DamageReportVM;
        setReport(reportData);
        setNewImages(reportData.images || []);
        setHasChanges(false);
      } else {
        toast.error('Không tải được dữ liệu báo cáo');
        onClose();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi tải báo cáo');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: DamageReportStatus) => {
    switch (status) {
      case DamageReportStatus.Pending:
        return <span className="badge bg-warning text-dark px-2 py-1 rounded-pill shadow-sm" style={{ fontSize: '0.65rem' }}>Chờ xử lý</span>;
      case DamageReportStatus.Assigned:
        return <span className="badge bg-info text-dark px-2 py-1 rounded-pill shadow-sm" style={{ fontSize: '0.65rem' }}>Đã phân công</span>;
      case DamageReportStatus.InProgress:
        return <span className="badge bg-primary px-2 py-1 rounded-pill shadow-sm" style={{ fontSize: '0.65rem' }}>Đang xử lý</span>;
      case DamageReportStatus.Completed:
        return <span className="badge bg-success px-2 py-1 rounded-pill shadow-sm" style={{ fontSize: '0.65rem' }}>Hoàn thành</span>;
      case DamageReportStatus.Cancelled:
        return <span className="badge bg-secondary px-2 py-1 rounded-pill shadow-sm" style={{ fontSize: '0.65rem' }}>Đã hủy</span>;
      case DamageReportStatus.Rejected:
        return <span className="badge bg-danger px-2 py-1 rounded-pill shadow-sm" style={{ fontSize: '0.65rem' }}>Từ chối</span>;
      default:
        return <span className="badge bg-light text-dark px-2 py-1 rounded-pill shadow-sm" style={{ fontSize: '0.65rem' }}>Chưa rõ</span>;
    }
  };

  const getPriorityBadge = (priority: DamageReportPriority) => {
    switch (priority) {
      case DamageReportPriority.Low:
        return <span className="badge bg-info-subtle text-info border border-info border-opacity-25 px-2 py-1 rounded-pill" style={{ fontSize: '0.65rem' }}>Thấp</span>;
      case DamageReportPriority.Normal:
        return <span className="badge bg-primary-subtle text-primary border border-primary border-opacity-25 px-2 py-1 rounded-pill" style={{ fontSize: '0.65rem' }}>Bình thường</span>;
      case DamageReportPriority.High:
        return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning border-opacity-25 px-2 py-1 rounded-pill" style={{ fontSize: '0.65rem' }}>Cao</span>;
      case DamageReportPriority.Urgent:
        return <span className="badge bg-danger-subtle text-danger border border-danger border-opacity-25 px-2 py-1 rounded-pill" style={{ fontSize: '0.65rem' }}>Khẩn cấp</span>;
      default:
        return <span className="badge bg-light text-dark px-2 py-1 rounded-pill" style={{ fontSize: '0.65rem' }}>---</span>;
    }
  };

  const handleSaveImages = async () => {
    if (!reportId || !hasChanges) return;

    try {
      setIsSaving(true);
      const res = await api.put(`/damage-reports/${reportId}/images`, { images: newImages });
      if (res.data.status) {
        toast.success('Cập nhật hình ảnh thành công');
        setHasChanges(false);
        if (onUpdate) onUpdate();
        loadReport();
      } else {
        toast.error(res.data.error || 'Lỗi khi cập nhật hình ảnh');
      }
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Lỗi khi cập nhật hình ảnh');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddImages = (urls: string[]) => {
    const combined = Array.from(new Set([...newImages, ...urls]));
    setNewImages(combined);
    setHasChanges(true);
    setShowFileManager(false);
  };

  const handleRemoveImage = (index: number) => {
    const filtered = newImages.filter((_, i) => i !== index);
    setNewImages(filtered);
    setHasChanges(true);
  };

  const canManageImages = isAdmin(currentUser?.roles);
  const isHandler = getCurrentUserStaffId() === report?.handlerId;
  const canAddImages = canManageImages || isHandler;
  const isTerminalStatus = [DamageReportStatus.Completed, DamageReportStatus.Cancelled, DamageReportStatus.Rejected].includes(report?.status as DamageReportStatus);
  const showAddButton = canAddImages && !isTerminalStatus;

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Overlay */}
      <div 
        className="modal show d-block" 
        tabIndex={-1} 
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1080, backdropFilter: 'blur(4px)' }} 
        onClick={onClose}
      >
        <div 
          className="modal-dialog modal-xl modal-dialog-scrollable modal-dialog-centered" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            {/* Header - Compact */}
            <div className="modal-header bg-white border-bottom p-2 px-4 shadow-sm">
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-3">
                  <i className="fas fa-file-invoice text-primary fs-6"></i>
                </div>
                <div>
                  <h6 className="modal-title fw-bold text-dark m-0">Chi tiết #{reportId}</h6>
                  <p className="text-muted m-0" style={{ fontSize: '0.7rem' }}>Báo cáo hư hỏng</p>
                </div>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" style={{ padding: '0.5rem' }}></button>
            </div>
            
            <div className="modal-body p-3 bg-light bg-opacity-10">
              {loading ? (
                <div className="d-flex flex-column justify-content-center align-items-center py-5">
                  <div className="spinner-border text-primary spinner-border-sm mb-3" role="status"></div>
                  <div className="text-muted small">Đang tải...</div>
                </div>
              ) : !report ? (
                <div className="text-center py-5">
                  <i className="fas fa-search text-muted opacity-25 fa-2x mb-2"></i>
                  <p className="text-muted small">Không tìm thấy dữ liệu.</p>
                </div>
              ) : (
                <div className="container-fluid p-0">
                  <div className="d-flex flex-column gap-3">
                    
                    {/* Maintenance Notice */}
                    {report.maintenanceBatchId && (
                      <div className="alert alert-info py-2 px-3 mb-1 d-flex align-items-center gap-3 border-0 shadow-sm" style={{ fontSize: '0.75rem', borderRadius: '12px', backgroundColor: '#eef6ff' }}>
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px', minWidth: '24px' }}>
                          <i className="fas fa-info fa-xs"></i>
                        </div>
                        <div>
                          <span className="fw-bold text-primary d-block">Báo cáo bảo trì tự động</span>
                          <span className="text-muted">Báo cáo này được hệ thống tự động sinh ra từ đợt bảo trì định kỳ.</span>
                        </div>
                      </div>
                    )}

                    {/* Location Card - More Compact */}
                    <div className="bg-white p-3 rounded-4 shadow-sm border-0">
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div className="flex-grow-1">
                          <h6 className="fw-bold mb-1 text-dark">
                            {report.displayLocation || report.damageLocation || 'Chưa xác định vị trí'}
                          </h6>
                          <div className="d-flex flex-wrap gap-3 text-muted" style={{ fontSize: '0.75rem' }}>
                            <span className="d-flex align-items-center"><i className="far fa-calendar-alt me-1 text-primary"></i>{formatDateDisplay(report.reportDate)}</span>
                          </div>
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                          {getStatusBadge(report.status)}
                          {getPriorityBadge(report.priority)}
                        </div>
                      </div>
                    </div>

                    {/* Content & Response - Side-by-side on large screens */}
                    <div className="row g-3">
                      {/* Description */}
                      <div className="col-lg-6">
                        <div className="bg-white p-3 rounded-4 shadow-sm h-100 d-flex flex-column">
                          <h6 className="text-primary fw-bold text-uppercase mb-2 d-flex align-items-center" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            <i className="fas fa-align-left me-2"></i>Nội dung báo cáo
                          </h6>
                          <div className="bg-light bg-opacity-50 p-2 rounded-3 mb-2 flex-grow-1" style={{ fontSize: '0.85rem', lineHeight: '1.4', color: '#2c3e50', whiteSpace: 'pre-wrap', maxHeight: '80px', overflowY: 'auto' }}>
                             {report.damageContent || 'Không có mô tả'}
                          </div>
                          <div className="pt-1 mt-auto border-top">
                             <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '0.7rem' }}>
                                <span className="text-muted"><i className="fas fa-user-edit me-1"></i>{report.reporterName}</span>
                                <span className="text-muted"><i className="fas fa-building me-1"></i>{report.reporterDepartmentName}</span>
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Handler Note */}
                      <div className="col-lg-6">
                        <div className="bg-white p-3 rounded-4 shadow-sm h-100 d-flex flex-column">
                           <h6 className="text-success fw-bold text-uppercase mb-2 d-flex align-items-center" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            <i className="fas fa-clipboard-check me-2"></i>Ghi chú xử lý
                          </h6>
                          <div className="border-start border-3 border-warning bg-warning bg-opacity-10 p-2 rounded-3 mb-2 flex-grow-1" style={{ maxHeight: '80px', overflowY: 'auto' }}>
                             <p className="mb-0 text-dark" style={{ lineHeight: '1.4', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                                {report.handlerNotes || 'Chưa có cập nhật'}
                             </p>
                          </div>
                          <div className="pt-1 mt-auto border-top d-flex justify-content-between align-items-center" style={{ fontSize: '0.7rem' }}>
                             <span className="text-muted"><i className="fas fa-user-cog me-1"></i>{report.handlerName || '---'}</span>
                             <span className="text-muted"><i className="fas fa-check-circle me-1"></i>{report.completedDate ? formatDateDisplay(report.completedDate) : '---'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Images Section - Shrunken grid */}
                    <div className="bg-white p-3 rounded-4 shadow-sm">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="text-dark fw-bold text-uppercase m-0" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                          <i className="fas fa-camera me-2 text-primary"></i>Hình ảnh hiện trạng ({newImages.length})
                        </h6>
                        {showAddButton && (
                          <button 
                            type="button" 
                            className="btn btn-primary btn-sm rounded-pill px-2 py-0 fw-bold"
                            onClick={() => setShowFileManager(true)}
                            style={{ fontSize: '0.6rem' }}
                          >
                            <i className="fas fa-plus me-1"></i> Thêm
                          </button>
                        )}
                      </div>
                      
                      <div className="image-grid">
                        {newImages.length > 0 ? (
                          newImages.map((img, idx) => (
                            <div key={`${img}-${idx}`} className="image-wrapper">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={img}
                                alt={`Hư hỏng ${idx + 1}`}
                                onClick={() => onViewImages?.(newImages, idx)}
                                onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=No+Image'; }}
                              />
                               {canManageImages && (
                                <button
                                  type="button"
                                  className="btn-remove-image"
                                  onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              )}
                              <div className="image-overlay" onClick={() => onViewImages?.(newImages, idx)}>
                                <i className="fas fa-expand text-white fs-6"></i>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-3 w-100 bg-light rounded-3 border-dashed border-2">
                             <p className="text-muted m-0" style={{ fontSize: '0.7rem', fontStyle: 'italic' }}>Không có ảnh</p>
                          </div>
                        )}
                      </div>

                      {/* After Images - Inline if possible */}
                      {Array.isArray(report.afterImages) && report.afterImages.length > 0 && (
                        <div className="mt-2 pt-2 border-top">
                          <h6 className="text-success fw-bold text-uppercase mb-2" style={{ fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                            <i className="fas fa-check-double me-2"></i>Ảnh hoàn tất ({report.afterImages.length})
                          </h6>
                          <div className="image-grid">
                            {report.afterImages.map((img, idx) => (
                              <div key={`${img}-${idx}`} className="image-wrapper border-success border-opacity-10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img}
                                  alt={`Sau xử lý ${idx + 1}`}
                                  onClick={() => onViewImages?.(report.afterImages!, idx)}
                                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=No+Image'; }}
                                />
                                <div className="image-overlay bg-success bg-opacity-10" onClick={() => onViewImages?.(report.afterImages!, idx)}>
                                  <i className="fas fa-expand text-white"></i>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer border-top bg-white p-2 px-4 shadow-sm">
              {hasChanges && (
                <button 
                  type="button" 
                  className="btn btn-primary px-3 py-1 fw-bold me-auto rounded-pill" 
                  onClick={handleSaveImages}
                  disabled={isSaving}
                  style={{ fontSize: '0.8rem' }}
                >
                  <i className={`fas ${isSaving ? 'fa-spinner fa-spin' : 'fa-save'} me-1`}></i>
                  Lưu thay đổi
                </button>
              )}
              <button 
                type="button" 
                className="btn btn-outline-secondary px-4 py-1 fw-bold rounded-pill" 
                onClick={onClose}
                disabled={isSaving}
                style={{ fontSize: '0.8rem' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* FileManager */}
      {showFileManager && (
        <FileManager
          isOpen={showFileManager}
          onClose={() => setShowFileManager(false)}
          onSelectFile={(url) => handleAddImages([url])}
          onSelectFiles={handleAddImages}
          accept="image/*"
          mode="image"
          multiSelect
          canManageFiles={canManageImages}
        />
      )}

      <style jsx>{`
        .image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
          gap: 10px;
        }
        .image-wrapper {
          position: relative;
          width: 100%;
          padding-bottom: 60%;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(0,0,0,0.05);
          cursor: pointer;
          transition: transform 0.2s;
          background-color: #f8f9fa;
        }
        .image-wrapper img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .image-wrapper:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          z-index: 5;
        }
        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .image-wrapper:hover .image-overlay {
          opacity: 1;
        }
        .btn-remove-image {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          border-radius: 6px;
          background: rgba(231, 76, 60, 0.9);
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justifyContent: center;
          z-index: 10;
          font-size: 0.6rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        }
        .border-dashed {
          border-style: dashed !important;
        }
      `}</style>
    </>
  );
};

export default QuickViewReportModal;
