'use client';

import React, { useState, useEffect } from 'react';
import { DamageReportVM, DamageReportStatus, DamageReportPriority } from '@/types';
import { formatDateDisplay } from '@/lib/utils/dateFormat';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';

interface QuickViewReportModalProps {
  reportId: number;
  isOpen: boolean;
  onClose: () => void;
  onViewImages?: (images: string[], index: number) => void;
}

const QuickViewReportModal: React.FC<QuickViewReportModalProps> = ({
  reportId,
  isOpen,
  onClose,
  onViewImages
}) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DamageReportVM | null>(null);

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
        setReport(res.data.data as DamageReportVM);
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
        return <span className="badge bg-warning text-dark">Chờ xử lý</span>;
      case DamageReportStatus.Assigned:
        return <span className="badge bg-info text-dark">Đã phân công</span>;
      case DamageReportStatus.InProgress:
        return <span className="badge bg-primary">Đang xử lý</span>;
      case DamageReportStatus.Completed:
        return <span className="badge bg-success">Hoàn thành</span>;
      case DamageReportStatus.Cancelled:
        return <span className="badge bg-secondary">Đã hủy</span>;
      case DamageReportStatus.Rejected:
        return <span className="badge bg-danger">Từ chối</span>;
      default:
        return <span className="badge bg-light text-dark">Lỗi/Không xác định</span>;
    }
  };

  const getPriorityBadge = (priority: DamageReportPriority) => {
    switch (priority) {
      case DamageReportPriority.Low:
        return <span className="badge bg-info text-dark">Thấp</span>;
      case DamageReportPriority.Normal:
        return <span className="badge bg-primary">Bình thường</span>;
      case DamageReportPriority.High:
        return <span className="badge bg-warning text-dark">Cao</span>;
      case DamageReportPriority.Urgent:
        return <span className="badge bg-danger">Khẩn cấp</span>;
      default:
        return <span className="badge bg-light text-dark">Không xác định</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100 }} onClick={onClose}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-header bg-light border-bottom-0">
            <h5 className="modal-title d-flex align-items-center">
              <i className="fas fa-file-alt me-2 text-primary"></i>
              Xem nhanh báo cáo
            </h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
          </div>
          <div className="modal-body p-4">
            {loading ? (
              <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Đang tải...</span>
                </div>
                <div className="text-muted">Đang tải chi tiết báo cáo...</div>
              </div>
            ) : !report ? (
              <div className="text-center py-5">
                <i className="fas fa-exclamation-circle text-muted fa-3x mb-3"></i>
                <div className="text-muted">Không tìm thấy dữ liệu báo cáo.</div>
              </div>
            ) : (
              <div className="container-fluid p-0">
                <div className="d-flex flex-column" style={{ gap: '20px' }}>
                  {/* Header Info */}
                  <div className="d-flex align-items-start justify-content-between flex-wrap gap-3">
                    <div>
                      <h4 className="fw-bold mb-1" style={{ color: '#2c3e50' }}>
                        {report.displayLocation || report.damageLocation || 'Không xác định vị trí'}
                      </h4>
                      <div className="text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.9rem' }}>
                        <span className="badge bg-light text-dark border">#{report.id}</span>
                        <span>•</span>
                        <span>Ngày báo cáo: {formatDateDisplay(report.reportDate) || '-'}</span>
                      </div>
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                      {getStatusBadge(report.status)}
                      {getPriorityBadge(report.priority)}
                    </div>
                  </div>

                  <hr className="my-0 opacity-10" />

                  {/* Details Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '20px',
                    }}
                  >
                    <div className="detail-item">
                      <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>Người báo cáo</div>
                      <div className="d-flex align-items-center">
                        <i className="fas fa-user-edit me-2 text-muted" style={{ width: '16px' }}></i>
                        <span className="fw-medium">{report.reporterName || '-'}</span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>Người xử lý</div>
                      <div className="d-flex align-items-center">
                        <i className="fas fa-user-cog me-2 text-muted" style={{ width: '16px' }}></i>
                        <span className="fw-medium">{report.handlerName || '-'}</span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>Ngày bắt đầu xử lý</div>
                      <div className="d-flex align-items-center">
                        <i className="fas fa-calendar-play me-2 text-muted" style={{ width: '16px' }}></i>
                        <span className="fw-medium">{report.handlingDate ? formatDateDisplay(report.handlingDate) : '-'}</span>
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="text-muted small fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.05em' }}>Ngày hoàn thành</div>
                      <div className="d-flex align-items-center">
                        <i className="fas fa-calendar-check me-2 text-muted" style={{ width: '16px' }}></i>
                        <span className="fw-medium">{report.completedDate ? formatDateDisplay(report.completedDate) : '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Sections */}
                  <div className="bg-light rounded-3 p-3 border">
                    <div className="text-muted small fw-bold text-uppercase mb-2" style={{ letterSpacing: '0.05em' }}>
                      Nội dung báo cáo
                    </div>
                    <div style={{ fontSize: '1rem', lineHeight: 1.6, color: '#34495e' }}>
                      {report.damageContent || '-'}
                    </div>
                  </div>

                  <div className="bg-light rounded-3 p-3 border">
                    <div className="text-muted small fw-bold text-uppercase mb-2" style={{ letterSpacing: '0.05em' }}>
                      Ghi chú người xử lý
                    </div>
                    <div 
                      style={{ 
                        fontSize: '1rem', 
                        lineHeight: 1.6, 
                        whiteSpace: 'pre-wrap', 
                        color: report.handlerNotes ? '#34495e' : '#95a5a6',
                        fontStyle: report.handlerNotes ? 'normal' : 'italic'
                      }}
                    >
                      {report.handlerNotes || 'Chưa có ghi chú xử lý'}
                    </div>
                  </div>

                  {report.notes && (
                    <div className="rounded-3 p-3 border border-dashed">
                      <div className="text-muted small fw-bold text-uppercase mb-2" style={{ letterSpacing: '0.05em' }}>
                        Ghi chú chung
                      </div>
                      <div style={{ fontSize: '1rem', lineHeight: 1.6 }}>{report.notes}</div>
                    </div>
                  )}

                  {/* Images */}
                  {Array.isArray(report.images) && report.images.length > 0 && (
                    <div>
                      <div className="text-muted small fw-bold text-uppercase mb-3" style={{ letterSpacing: '0.05em' }}>
                        Hình ảnh đính kèm ({report.images.length})
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                          gap: '12px',
                        }}
                      >
                        {report.images.map((img, idx) => (
                          <div
                            key={`${img}-${idx}`}
                            onClick={() => onViewImages?.(report.images!, idx)}
                            style={{
                              position: 'relative',
                              width: '100%',
                              paddingBottom: '75%',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              border: '1px solid #dee2e6',
                              cursor: onViewImages ? 'pointer' : 'default',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                              backgroundColor: '#f8f9fa'
                            }}
                            className={onViewImages ? 'hover-shadow' : ''}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img}
                              alt={`Hư hỏng ${idx + 1}`}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=No+Image';
                              }}
                            />
                            {onViewImages && (
                              <div 
                                className="image-overlay"
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  backgroundColor: 'rgba(0,0,0,0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  opacity: 0,
                                  transition: 'opacity 0.2s'
                                }}
                              >
                                <i className="fas fa-search-plus text-white fa-lg"></i>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* After Images */}
                  {Array.isArray(report.afterImages) && report.afterImages.length > 0 && (
                    <div>
                      <div className="text-muted small fw-bold text-uppercase mb-3" style={{ letterSpacing: '0.05em', color: '#27ae60' }}>
                        Hình ảnh sau khi xử lý ({report.afterImages.length})
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                          gap: '12px',
                        }}
                      >
                        {report.afterImages.map((img, idx) => (
                          <div
                            key={`${img}-${idx}`}
                            onClick={() => onViewImages?.(report.afterImages!, idx)}
                            style={{
                              position: 'relative',
                              width: '100%',
                              paddingBottom: '75%',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              border: '2px solid #d1e7dd',
                              cursor: onViewImages ? 'pointer' : 'default',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                              backgroundColor: '#f8f9fa'
                            }}
                            className={onViewImages ? 'hover-shadow' : ''}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img}
                              alt={`Sau xử lý ${idx + 1}`}
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=No+Image';
                              }}
                            />
                            {onViewImages && (
                              <div 
                                className="image-overlay"
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  backgroundColor: 'rgba(39, 174, 96, 0.2)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  opacity: 0,
                                  transition: 'opacity 0.2s'
                                }}
                              >
                                <i className="fas fa-search-plus text-white fa-lg"></i>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer border-top-0 bg-light p-3">
            <button 
              type="button" 
              className="btn btn-secondary px-4 fw-medium" 
              onClick={onClose}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .hover-shadow:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .hover-shadow:hover .image-overlay {
          opacity: 1 !important;
        }
        .detail-item i {
          color: #3498db;
        }
      `}</style>
    </div>
  );
};

export default QuickViewReportModal;
