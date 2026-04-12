'use client';

import React, { useState, useEffect, useRef } from 'react';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';

interface ExportModalProps {
  show: boolean;
  onClose: () => void;
  title: string;
  apiEndpoint: string;
  params: Record<string, any>;
  defaultFileName?: string;
  // Optional: filters to show in the modal for advanced refinement
  filterOptions?: {
    statuses?: { id: number | string, name: string }[];
    priorities?: { id: number | string, name: string }[];
    departments?: { id: number | string, name: string }[];
    categories?: { id: number | string, name: string }[];
    locations?: { id: number | string, name: string }[];
  };
}

const ExportModal: React.FC<ExportModalProps> = ({
  show,
  onClose,
  title,
  apiEndpoint,
  params,
  defaultFileName = 'BaoCao',
  filterOptions
}) => {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [localParams, setLocalParams] = useState<Record<string, any>>(params);
  const [showFilters, setShowFilters] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) {
      setLocalParams(params);
      handlePreview(params);
      // Reset visible columns when modal opens
      setVisibleColumns({});
    } else {
      setPreviewData([]);
      setColumns([]);
      setShowFilters(false);
    }
  }, [show, params]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowColumnDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePreview = async (currentParams = localParams) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(currentParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
      queryParams.append('preview', 'true');
      
      const response = await api.get(`${apiEndpoint}?${queryParams.toString()}`);
      
      if (response.data.status) {
        const data = response.data.data || [];
        setPreviewData(data);
        if (data.length > 0) {
          const cols = Object.keys(data[0]);
          // Keep current column order if columns are already set
          if (columns.length === 0) {
            setColumns(cols);
          }
          
          // Initialize visible columns if not already set
          if (Object.keys(visibleColumns).length === 0) {
            const initial: Record<string, boolean> = {};
            cols.forEach(col => {
              initial[col] = true;
            });
            setVisibleColumns(initial);
          }
        }
      } else {
        toast.error(response.data.error || 'Không thể tải dữ liệu xem trước');
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error('Lỗi khi tải bản xem trước');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const selectedColumns = columns.filter(col => visibleColumns[col]);
      
      const { saveAs } = await import('file-saver');
      const ExcelJS = await import('exceljs');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Báo cáo');

      // Add Title & Metadata
      worksheet.mergeCells('A1', String.fromCharCode(64 + selectedColumns.length) + '1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = title.toUpperCase();
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center' };

      worksheet.addRow([]); // Spacer

      // Add Headers
      const headerRow = worksheet.addRow(selectedColumns);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2C3E50' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 25;

      // Add Data
      previewData.forEach(item => {
        const rowData = selectedColumns.map(col => item[col]);
        const row = worksheet.addRow(rowData);
        row.alignment = { vertical: 'middle', wrapText: true };
      });

      // Style Table Cells
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 3) {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });
        }
      });

      // Auto-size columns better
      selectedColumns.forEach((col, idx) => {
        let maxLen = col.length + 5;
        previewData.forEach(item => {
          const val = String(item[col] || '');
          if (val.length > maxLen) maxLen = Math.min(val.length, 50);
        });
        worksheet.getColumn(idx + 1).width = maxLen;
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${defaultFileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      
      toast.success('Xuất Excel thành công!');
      onClose();
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Lỗi khi xuất file Excel');
    } finally {
      setLoading(false);
    }
  };

  const toggleColumn = (col: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [col]: !prev[col]
    }));
  };

  const moveColumn = (idx: number, direction: 'up' | 'down') => {
    const newCols = [...columns];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newCols.length) return;
    
    [newCols[idx], newCols[targetIdx]] = [newCols[targetIdx], newCols[idx]];
    setColumns(newCols);
  };

  const handleParamChange = (key: string, value: any) => {
    setLocalParams(prev => ({ ...prev, [key]: value }));
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-2xl" style={{ borderRadius: '20px', overflow: 'hidden' }}>
          {/* Header */}
          <div className="modal-header border-0 px-4 pt-4 pb-2 d-flex justify-content-between align-items-center bg-white sticky-top">
            <div>
              <h5 className="modal-title fw-bold text-primary mb-1" style={{ fontSize: '1.4rem', letterSpacing: '-0.5px' }}>
                <i className="fas fa-file-excel me-2"></i>
                {title}
              </h5>
              <p className="text-muted small mb-0">Tối ưu hóa bảng dữ liệu và thứ tự cột trước khi tải về</p>
            </div>
            <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
          </div>

          <div className="modal-body px-4 py-2">
            {/* Advanced Filters Section */}
            <div className="mb-3">
              <button 
                className="btn btn-link btn-sm text-decoration-none p-0 d-flex align-items-center gap-2 mb-2"
                onClick={() => setShowFilters(!showFilters)}
              >
                <i className={`fas ${showFilters ? 'fa-chevron-down' : 'fa-chevron-right'} text-primary`}></i>
                <span className="fw-semibold text-dark">Bộ lọc nâng cao</span>
                {!showFilters && <span className="badge bg-primary rounded-pill" style={{ fontSize: '0.65rem' }}>Bổ sung</span>}
              </button>

              {showFilters && (
                <div className="card border-0 bg-light p-3 mb-3 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="row g-3">
                    <div className="col-12 col-md-4 col-lg-3">
                      <label className="small fw-bold text-muted mb-1">Từ ngày</label>
                      <input 
                        type="date" 
                        className="form-control form-control-sm" 
                        value={localParams.fromDate ? new Date(localParams.fromDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleParamChange('fromDate', e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-4 col-lg-3">
                      <label className="small fw-bold text-muted mb-1">Đến ngày</label>
                      <input 
                        type="date" 
                        className="form-control form-control-sm" 
                        value={localParams.toDate ? new Date(localParams.toDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleParamChange('toDate', e.target.value)}
                      />
                    </div>
                    {filterOptions?.statuses && (
                      <div className="col-12 col-md-4 col-lg-3">
                        <label className="small fw-bold text-muted mb-1">Trạng thái</label>
                        <select 
                          className="form-select form-select-sm"
                          value={localParams.status || 0}
                          onChange={(e) => handleParamChange('status', e.target.value)}
                        >
                          <option value={0}>Tất cả</option>
                          {filterOptions.statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                    )}
                    {filterOptions?.priorities && (
                      <div className="col-12 col-md-4 col-lg-3">
                        <label className="small fw-bold text-muted mb-1">Độ ưu tiên</label>
                        <select 
                          className="form-select form-select-sm"
                          value={localParams.priority || 0}
                          onChange={(e) => handleParamChange('priority', e.target.value)}
                        >
                          <option value={0}>Tất cả</option>
                          {filterOptions.priorities.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    )}
                    <div className="col-12 d-flex justify-content-end mt-3">
                      <button className="btn btn-primary btn-sm px-4 rounded-pill" onClick={() => handlePreview()}>
                        <i className="fas fa-sync-alt me-2"></i>Áp dụng
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Toolbar */}
            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
              <div className="d-flex align-items-center gap-2">
                <div className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-2" style={{ borderRadius: '8px' }}>
                  <i className="fas fa-list-ol me-2"></i>
                  Bản ghi: <strong>{previewData.length}</strong>
                </div>
                
                {/* Column Column Selector Dropdown */}
                <div className="position-relative" ref={dropdownRef}>
                  <button 
                    className="btn btn-white btn-sm border d-flex align-items-center gap-2 shadow-sm"
                    onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                    style={{ borderRadius: '8px', padding: '0.5rem 1rem' }}
                  >
                    <i className="fas fa-columns text-primary"></i>
                    Thứ tự & Hiển thị cột
                  </button>
                  
                  {showColumnDropdown && (
                    <div className="position-absolute bg-white shadow-xl border rounded-lg p-3 mt-2" 
                         style={{ zIndex: 1000, minWidth: '320px', maxHeight: '400px', overflowY: 'auto', right: 0, borderRadius: '12px' }}>
                      <div className="fw-bold mb-3 pb-2 border-bottom small text-uppercase text-muted d-flex justify-content-between align-items-center">
                        <span>Cấu trúc bảng</span>
                        <span className="badge bg-light text-dark font-monospace">{columns.length} cột</span>
                      </div>
                      {columns.map((col, idx) => (
                        <div key={col} className="d-flex align-items-center mb-2 p-2 hover-bg-light rounded" style={{ backgroundColor: visibleColumns[col] ? 'transparent' : '#f8f9fa' }}>
                          <input 
                            className="form-check-input me-3" 
                            type="checkbox" 
                            id={`col-${col}`}
                            checked={visibleColumns[col]}
                            onChange={() => toggleColumn(col)}
                          />
                          <label className={`form-check-label small flex-grow-1 cursor-pointer ${visibleColumns[col] ? 'fw-semibold' : 'text-muted'}`} htmlFor={`col-${col}`}>
                            {col}
                          </label>
                          <div className="btn-group btn-group-sm ms-2">
                            <button className="btn btn-link text-muted p-1" onClick={() => moveColumn(idx, 'up')} disabled={idx === 0}>
                              <i className="fas fa-chevron-up"></i>
                            </button>
                            <button className="btn btn-link text-muted p-1" onClick={() => moveColumn(idx, 'down')} disabled={idx === columns.length - 1}>
                              <i className="fas fa-chevron-down"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="d-flex gap-2">
                <button 
                  className="btn btn-light btn-sm text-primary shadow-sm" 
                  onClick={() => handlePreview()} 
                  disabled={loading}
                  style={{ borderRadius: '8px', padding: '0.5rem 1rem' }}
                >
                  <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                </button>
              </div>
            </div>

            {/* Preview Table Container */}
            <div className="position-relative border border-opacity-50 rounded-lg overflow-hidden shadow-inner" 
                 style={{ minHeight: '400px', backgroundColor: '#fff', borderRadius: '12px' }}>
              {loading && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-white bg-opacity-75" style={{ zIndex: 100 }}>
                  <div className="d-flex flex-column align-items-center">
                    <div className="spinner-border text-primary mb-2" role="status"></div>
                    <span className="small text-muted fw-semibold">Đang tổng hợp dữ liệu...</span>
                  </div>
                </div>
              )}

              {previewData.length > 0 ? (
                <div className="table-responsive custom-scrollbar" style={{ maxHeight: '55vh' }}>
                  <table className="table table-hover table-sm mb-0 align-middle">
                    <thead className="sticky-top bg-white" style={{ zIndex: 10 }}>
                      <tr>
                        {columns.filter(col => visibleColumns[col]).map(col => (
                          <th key={col} className="px-3 py-3 text-nowrap border-bottom bg-white" 
                              style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, idx) => (
                        <tr key={idx}>
                          {columns.filter(col => visibleColumns[col]).map((col, cIdx) => (
                            <td key={col} className="px-3 py-2" style={{ 
                              fontSize: '0.85rem', 
                              color: '#1e293b',
                              maxWidth: '300px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {row[col] ? (
                                <span title={String(row[col])}>{String(row[col])}</span>
                              ) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : !loading && (
                <div className="d-flex flex-column align-items-center justify-content-center py-5">
                  <div className="mb-4 bg-light rounded-circle p-4">
                    <i className="fas fa-file-excel fa-4xl text-muted opacity-25"></i>
                  </div>
                  <h6 className="fw-bold text-muted">Không tìm thấy bản ghi nào</h6>
                  <p className="small text-muted">Vui lòng điều chỉnh lại bộ lọc thời gian hoặc tiêu chí khác</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer border-0 px-4 pb-4 pt-3 bg-white">
            <button type="button" className="btn btn-link text-muted text-decoration-none px-4 fw-semibold" onClick={onClose}>Hủy bỏ</button>
            <button 
              type="button" 
              className="btn btn-primary px-5 py-2 shadow-lg d-flex align-items-center gap-2 translate-hover" 
              onClick={handleExport}
              disabled={loading || previewData.length === 0}
              style={{ borderRadius: '14px', fontWeight: '700', minWidth: '200px', height: '50px', justifyContent: 'center' }}
            >
              <i className="fas fa-file-excel me-1"></i>
              XUẤT FILE EXCEL
            </button>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        .translate-hover {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .translate-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        
        .hover-bg-light:hover {
          background-color: #f8fafc;
        }
        
        thead th {
          box-shadow: inset 0 -1px 0 #e2e8f0;
        }
      `}</style>
    </div>
  );
};

export default ExportModal;
