'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import imageCompression from 'browser-image-compression';
import { formatDateDisplay } from '@/lib/utils/dateFormat';

interface FileItem {
  name: string;
  url: string;
  path: string;
  size: number;
  modified: string;
  isDirectory: boolean;
}

interface FileManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile?: (fileUrl: string) => void;
  onSelectFiles?: (fileUrls: string[]) => void;
  accept?: string;
  mode?: 'image' | 'all';
  multiSelect?: boolean;
  canManageFiles?: boolean;
}

type ViewMode = 'list' | 'grid';

export default function FileManager({ 
  isOpen, 
  onClose, 
  onSelectFile,
  onSelectFiles,
  accept, 
  mode = 'all',
  multiSelect = false,
  canManageFiles
}: FileManagerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [canManage, setCanManage] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(24); // Use 24 for grid (divisible by 2, 3, 4, 6)
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = async (page = 1) => {
    setLoading(true);
    try {
      const response = await api.get(`/files/list?page=${page}&limit=${itemsPerPage}`);
      let fileList = response.data?.files || [];
      setTotalFiles(response.data?.total || 0);
      setTotalPages(response.data?.totalPages || 0);
      setCurrentPage(response.data?.page || page);
      
      if (mode === 'image' || accept === 'image/*') {
        fileList = fileList.filter((file: FileItem) => {
          const ext = file.name.toLowerCase();
          return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || 
                 ext.endsWith('.png') || ext.endsWith('.gif') || 
                 ext.endsWith('.webp') || ext.endsWith('.svg');
        });
      }
      
      setFiles(fileList);
    } catch (error: any) {
      console.error('FileManager: Error loading files:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Lỗi khi tải danh sách file';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      loadFiles(1);
      setSelectedFiles(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (typeof canManageFiles === 'boolean') {
      setCanManage(canManageFiles);
      return;
    }

    if (typeof window === 'undefined') {
      setCanManage(false);
      return;
    }

    try {
      const storedUser = window.localStorage.getItem('user');
      if (!storedUser) {
        setCanManage(false);
        return;
      }

      const user = JSON.parse(storedUser);
      if (user?.isAdmin === true) {
        setCanManage(true);
        return;
      }

      const roleSources = [
        user?.roles,
        user?.Roles,
        user?.roleNames,
        user?.role,
      ];
      const roles: string[] = [];
      roleSources.forEach((source) => {
        if (!source) return;
        if (Array.isArray(source)) {
          roles.push(...source);
        } else {
          roles.push(source);
        }
      });

      const normalized = roles
        .map((role) => (role ? String(role).trim().toLowerCase() : ''))
        .filter(Boolean);
      const adminRoles = new Set([
        'admin',
        'administrator',
        'super_admin',
        'superadmin',
        'system_admin',
        'systemadmin',
        'root',
      ]);
      const hasAdminRole = normalized.some((role) => adminRoles.has(role));
      setCanManage(hasAdminRole);
    } catch (error) {
      console.warn('FileManager: Unable to determine admin privileges:', error);
      setCanManage(false);
    }
  }, [canManageFiles, isOpen]);

  const compressImage = async (file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) {
      return file;
    }

    try {
      const options = {
        maxSizeMB: 1, // Maximum file size in MB
        maxWidthOrHeight: 1920, // Maximum width or height
        useWebWorker: true,
        fileType: file.type,
      } as any;

      const compressed = await imageCompression(file, options);

      // imageCompression may return a Blob; always convert to File and preserve original filename
      const resultFile = compressed instanceof File
        ? compressed
        : new File([compressed], file.name, {
            type: (compressed as Blob).type || file.type || 'image/jpeg',
            lastModified: (compressed as any).lastModified || Date.now(),
          });

      // Ensure the name stays the original
      if (resultFile.name !== file.name) {
        return new File([resultFile], file.name, {
          type: resultFile.type,
          lastModified: resultFile.lastModified,
        });
      }

      return resultFile;
    } catch (error) {
      console.error('Image compression error:', error);
      // Return original if compression fails
      return file;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesToUpload = Array.from(e.target.files || []);
    
    if (filesToUpload.length === 0) {
      return;
    }

    // Validate file types for image mode
    if (mode === 'image' || accept === 'image/*') {
      const invalidFiles = filesToUpload.filter(file => !file.type.startsWith('image/'));
      if (invalidFiles.length > 0) {
        toast.error('Vui lòng chọn file hình ảnh');
        return;
      }
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const file of filesToUpload) {
        try {
          // Compress image if it's an image file
          let fileToUpload: File;
          try {
            // Only compress if file is larger than 500KB
            if (file.size > 500 * 1024 && file.type.startsWith('image/')) {
              fileToUpload = await compressImage(file);
            } else {
              fileToUpload = file;
            }
          } catch (compressionError) {
            fileToUpload = file;
          }

          // Validate file before upload
          if (!fileToUpload || !(fileToUpload instanceof File)) {
            toast.error(`File ${file.name} không hợp lệ`);
            failCount++;
            continue;
          }

          const formData = new FormData();
          formData.append('file', fileToUpload, fileToUpload.name);

          const response = await api.post('/files/upload', formData);
          
          if (response.data && response.data.success) {
            successCount++;
          } else {
            toast.error(`Lỗi khi upload ${file.name}: ${response.data?.error || 'Unknown error'}`);
            failCount++;
          }
        } catch (error: any) {
          console.error(`Error uploading ${file.name}:`, error);
          const errorMsg = error.response?.data?.error || error.message || 'Lỗi không xác định';
          toast.error(`Lỗi khi upload ${file.name}: ${errorMsg}`);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Upload thành công ${successCount} file${successCount > 1 ? 's' : ''}`);
        // Add a small delay to ensure blob is available
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          loadFiles(1); // On upload, we usually want to see the newest file (on page 1)
        } catch (loadError) {
          console.error('FileManager: Failed to reload files after upload:', loadError);
        }
      }
      if (failCount > 0) {
        toast.error(`Lỗi khi upload ${failCount} file${failCount > 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error('Lỗi khi upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const deleteFileRequest = async (file: FileItem) => {
    const target = encodeURIComponent(file.path || file.url || file.name);
    await api.delete(`/files/delete?file=${target}`);
  };

  const handleDeleteFile = async (file: FileItem) => {
    if (!canManage) {
      toast.error('Bạn không có quyền xóa file');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa file "${file.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteFileRequest(file);
      toast.success('Xóa file thành công');
      try {
        loadFiles(currentPage);
      } catch (error) {
        console.error('FileManager: Failed to reload files after deleting:', error);
      }
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.url);
        return newSet;
      });
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Lỗi khi xóa file';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!canManage) {
      toast.error('Bạn không có quyền xóa file');
      return;
    }

    if (selectedFiles.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một file để xóa');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedFiles.size} file đã chọn?`)) {
      return;
    }

    const selectedItems = files.filter(file => selectedFiles.has(file.url));
    if (selectedItems.length === 0) {
      toast.warning('Không tìm thấy file đã chọn');
      return;
    }

    setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const file of selectedItems) {
        try {
          await deleteFileRequest(file);
          successCount++;
        } catch (error) {
          console.error(`Delete error for ${file.name}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Đã xóa ${successCount} file`);
      }
      if (failCount > 0) {
        toast.error(`Không thể xóa ${failCount} file`);
      }

      try {
        loadFiles(currentPage);
      } catch (error) {
        console.error('FileManager: Failed to reload files after deleting selections:', error);
      }
      setSelectedFiles(new Set());
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRenameFile = async (oldName: string, newName: string) => {
    if (!canManage) {
      toast.error('Bạn không có quyền đổi tên file');
      setRenamingFile(null);
      return;
    }

    if (!newName || newName.trim() === '') {
      toast.error('Tên file không được để trống');
      return;
    }

    if (newName === oldName) {
      setRenamingFile(null);
      return;
    }

    try {
      const trimmedName = newName.trim();
      await api.post('/files/rename', { oldName, newName: trimmedName });
      toast.success('Đổi tên file thành công');
      loadFiles(currentPage);
      setSelectedFiles(new Set());
      setRenamingFile(null);
      setNewFileName('');
    } catch (error: any) {
      console.error('Rename error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Lỗi khi đổi tên file';
      toast.error(errorMessage);
    }
  };

  const selectionEnabled = multiSelect || canManage;

  const handleSelectFile = (file: FileItem) => {
    if (selectionEnabled) {
      setSelectedFiles(prev => {
        const newSet = new Set(prev);
        if (newSet.has(file.url)) {
          newSet.delete(file.url);
        } else {
          newSet.add(file.url);
        }
        return newSet;
      });
    } else {
      setSelectedFiles(new Set([file.url]));
    }
  };

  const handleSelectAll = () => {
    if (!selectionEnabled) {
      return;
    }

    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.url)));
    }
  };

  const handleConfirm = () => {
    if (selectedFiles.size === 0) {
      toast.warning('Vui lòng chọn ít nhất một file');
      return;
    }

    const selectedUrls = Array.from(selectedFiles);

    if (multiSelect) {
      if (onSelectFiles) {
        onSelectFiles(selectedUrls);
      } else if (onSelectFile) {
        selectedUrls.forEach((url) => onSelectFile(url));
      }
    } else {
      const firstSelected = selectedUrls[0];
      if (firstSelected && onSelectFile) {
        onSelectFile(firstSelected);
      } else if (!firstSelected) {
        console.error('FileManager: No file selected');
      }
    }
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    const iconMap: { [key: string]: string } = {
      jpg: 'fa-image',
      jpeg: 'fa-image',
      png: 'fa-image',
      gif: 'fa-image',
      webp: 'fa-image',
      svg: 'fa-image',
      pdf: 'fa-file-pdf',
      doc: 'fa-file-word',
      docx: 'fa-file-word',
      xls: 'fa-file-excel',
      xlsx: 'fa-file-excel',
      zip: 'fa-file-archive',
      rar: 'fa-file-archive',
    };
    return iconMap[ext || ''] || 'fa-file';
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
    <div 
      className="modal show d-block" 
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} 
      tabIndex={-1}
    >
      <div className={`modal-dialog ${isFullscreen ? 'modal-fullscreen' : 'modal-xl'} modal-dialog-scrollable`} style={{ zIndex: 1061 }}>
        <div className="modal-content">
          <div className="modal-header d-flex align-items-center justify-content-between py-2 px-3">
            <h5 className="modal-title mb-0 d-flex align-items-center">
              <i className="fas fa-folder-open me-2 text-primary"></i> 
              <span className="fs-6 fs-sm-5 fw-bold text-nowrap d-none d-xs-inline">File</span>
              <span className="fs-6 fs-sm-5 fw-bold text-nowrap d-xs-none">File</span>
              {selectedFiles.size > 0 && (
                <span className="badge rounded-pill bg-primary ms-2 shadow-sm" style={{ fontSize: '0.65rem' }}>{selectedFiles.size}</span>
              )}
            </h5>
            <div className="d-flex gap-1 gap-sm-2 align-items-center">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm rounded-pill d-flex align-items-center px-2 py-1"
                onClick={() => loadFiles()}
                disabled={loading || uploading}
                style={{ fontSize: '0.8rem' }}
                title="Tải lại"
              >
                <i className="fas fa-sync-alt"></i> 
                <span className="d-none d-sm-inline ms-1">Tải lại</span>
              </button>
              <button
                type="button"
                className="btn btn-info btn-sm rounded-pill d-flex align-items-center px-2 py-1 shadow-sm text-white"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
                style={{ fontSize: '0.8rem', backgroundColor: '#0dcaf0', borderColor: '#0dcaf0' }}
                title="Chụp ảnh trực tiếp"
              >
                <i className="fas fa-camera"></i> 
                <span className="d-none d-sm-inline ms-1">Chụp ảnh</span>
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm rounded-pill d-flex align-items-center px-2 py-1 shadow-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ fontSize: '0.8rem' }}
                title="Tải lên"
              >
                <i className="fas fa-plus"></i> 
                <span className="d-none d-sm-inline ms-1">Tải lên</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill d-flex align-items-center p-1"
                onClick={() => setIsFullscreen(!isFullscreen)}
                style={{ width: '28px', height: '28px', justifyContent: 'center' }}
                title={isFullscreen ? 'Thu nhỏ' : 'Phóng to'}
              >
                <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} style={{ fontSize: '0.75rem' }}></i>
              </button>
              <button
                type="button"
                className="btn-close ms-1"
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
          </div>
          <div className="modal-body">
            {/* Toolbar */}
            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
              <div className="d-flex gap-2 align-items-center">
                {selectionEnabled && files.length > 0 && (
                  <button
                    type="button"
                    className={`btn btn-sm rounded-3 ${selectedFiles.size === files.length ? 'btn-primary shadow-sm' : 'btn-outline-secondary'}`}
                    onClick={handleSelectAll}
                    disabled={isDeleting}
                    title={selectedFiles.size === files.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  >
                    <i className={`fas ${selectedFiles.size === files.length ? 'fa-check-double' : 'fa-check-square'}`}></i>
                    <span className="d-none d-sm-inline ms-1">{selectedFiles.size === files.length ? 'Bỏ chọn' : 'Tất cả'}</span>
                  </button>
                )}
                {canManage && selectedFiles.size > 0 && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm rounded-3"
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    title="Xóa đã chọn"
                  >
                    {isDeleting ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <>
                        <i className="fas fa-trash"></i>
                        <span className="d-none d-sm-inline ms-1">Xóa {selectedFiles.size}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="btn-group btn-group-sm" role="group">
                <button
                  type="button"
                  className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('grid')}
                  title="Xem dạng lưới"
                >
                  <i className="fas fa-th"></i>
                </button>
                <button
                  type="button"
                  className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setViewMode('list')}
                  title="Xem dạng danh sách"
                >
                  <i className="fas fa-list"></i>
                </button>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept={accept}
              multiple
              style={{ display: 'none' }}
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
            />

            {/* Upload progress */}
            {uploading && (
              <div className="alert alert-info mb-3">
                <i className="fas fa-spinner fa-spin"></i> Đang upload file...
              </div>
            )}
            {isDeleting && !uploading && (
              <div className="alert alert-warning mb-3">
                <i className="fas fa-spinner fa-spin"></i> Đang xóa file...
              </div>
            )}

            {/* File List */}
            {loading ? (
              <div className="text-center py-5">
                <i className="fas fa-spinner fa-spin fa-3x"></i>
                <p className="mt-3">Đang tải...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="fas fa-folder-open fa-4x mb-3"></i>
                <p>Chưa có file nào</p>
              </div>
            ) : viewMode === 'grid' ? (
              // Grid View - Use more columns and less padding
              <div className="row g-2" style={{ maxHeight: isFullscreen ? 'calc(100vh - 250px)' : '550px', overflowY: 'auto' }}>
                {files.map((file) => {
                  const isImage = file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/);
                  const isSelected = selectedFiles.has(file.url);
                  const isRenaming = renamingFile === file.name;
                  
                  return (
                    <div key={file.name} className="col-lg-2 col-md-3 col-sm-4 col-6">
                      <div
                        className={`card h-100 border-0 shadow-sm file-card ${isSelected ? 'selected' : ''}`}
                        style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                        onClick={() => !isRenaming && handleSelectFile(file)}
                      >
                        <div className="card-body p-1 text-center d-flex flex-column" style={{ minHeight: '140px' }}>
                          <div className="flex-grow-1 d-flex align-items-center justify-content-center p-1 bg-light rounded" style={{ height: '100px', overflow: 'hidden' }}>
                            {isImage ? (
                              <img
                                src={file.url}
                                alt={file.name}
                                className="img-thumbnail border-0 bg-transparent"
                                style={{
                                  maxHeight: '100%',
                                  width: 'auto',
                                  maxWidth: '100%',
                                  objectFit: 'contain',
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="py-2">
                                <i className={`fas ${getFileIcon(file.name)} fa-3x text-muted`}></i>
                              </div>
                            )}
                          </div>
                          
                          {isRenaming && canManage ? (
                            <input
                              type="text"
                              className="form-control form-control-sm mt-1"
                              style={{ fontSize: '0.7rem' }}
                              value={newFileName}
                              onChange={(e) => setNewFileName(e.target.value)}
                              onBlur={() => {
                                if (newFileName.trim()) {
                                  handleRenameFile(file.name, newFileName);
                                } else {
                                  setRenamingFile(null);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (newFileName.trim()) {
                                    handleRenameFile(file.name, newFileName);
                                  }
                                } else if (e.key === 'Escape') {
                                  setRenamingFile(null);
                                  setNewFileName('');
                                }
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="mt-1 px-1 overflow-hidden">
                              <small className="d-block text-truncate fw-medium mb-0" title={file.name} style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>
                                {file.name}
                              </small>
                              <small className="text-muted" style={{ fontSize: '0.65rem' }}>{formatFileSize(file.size)}</small>
                            </div>
                          )}
                        </div>

                        {/* Status overlay (Top-Left) */}
                        {isSelected && (
                          <div className="position-absolute top-0 start-0 m-1" style={{ zIndex: 12 }}>
                            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '22px', height: '22px' }}>
                              <i className="fas fa-check" style={{ fontSize: '10px' }}></i>
                            </div>
                          </div>
                        )}
                        {isSelected && (
                          <div className="position-absolute top-0 start-0 w-100 h-100" style={{ backgroundColor: 'rgba(13, 110, 253, 0.1)', pointerEvents: 'none', zIndex: 1 }}></div>
                        )}

                        {/* Centered Hover controls */}
                        {canManage && !isRenaming && (
                          <div className="file-actions position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center gap-2 opacity-0" style={{ transition: 'all 0.25s ease', zIndex: 15 }}>
                            <button
                              className="btn btn-light shadow-lg rounded-circle d-flex align-items-center justify-content-center border"
                              style={{ width: '32px', height: '32px', padding: 0 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isDeleting) return;
                                setRenamingFile(file.name);
                                setNewFileName(file.name);
                              }}
                              title="Đổi tên"
                              disabled={isDeleting}
                            >
                              <i className="fas fa-edit text-primary"></i>
                            </button>
                            <button
                              className="btn btn-light shadow-lg rounded-circle d-flex align-items-center justify-content-center border"
                              style={{ width: '32px', height: '32px', padding: 0 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isDeleting) return;
                                handleDeleteFile(file);
                              }}
                              title="Xóa"
                              disabled={isDeleting}
                            >
                              <i className="fas fa-trash text-danger"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // List View
              <div className="table-responsive" style={{ maxHeight: isFullscreen ? 'calc(100vh - 250px)' : '500px', overflowY: 'auto' }}>
                <table className="table table-hover table-sm">
                  <thead className="table-light sticky-top">
                    <tr>
                      {multiSelect && (
                        <th style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selectedFiles.size === files.length && files.length > 0}
                            onChange={handleSelectAll}
                          />
                        </th>
                      )}
                      <th style={{ width: '60px' }}>Preview</th>
                      <th>Tên file</th>
                      <th>Kích thước</th>
                      <th>Ngày sửa</th>
                      <th style={{ width: '120px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => {
                      const isImage = file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/);
                      const isSelected = selectedFiles.has(file.url);
                      const isRenaming = renamingFile === file.name;
                      
                      return (
                        <tr
                          key={file.name}
                          className={isSelected ? 'table-primary' : ''}
                          style={{ cursor: 'pointer' }}
                          onClick={() => !isRenaming && handleSelectFile(file)}
                        >
                          {multiSelect && (
                            <td onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectFile(file)}
                              />
                            </td>
                          )}
                          <td>
                            {isImage ? (
                              <img
                                src={file.url}
                                alt={file.name}
                                style={{
                                  width: '50px',
                                  height: '50px',
                                  objectFit: 'cover',
                                  borderRadius: '4px',
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <i className={`fas ${getFileIcon(file.name)} fa-2x text-muted`}></i>
                            )}
                          </td>
                          <td>
                            {isRenaming && canManage ? (
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                onBlur={() => {
                                  if (newFileName.trim()) {
                                    handleRenameFile(file.name, newFileName);
                                  } else {
                                    setRenamingFile(null);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    if (newFileName.trim()) {
                                      handleRenameFile(file.name, newFileName);
                                    }
                                  } else if (e.key === 'Escape') {
                                    setRenamingFile(null);
                                    setNewFileName('');
                                  }
                                }}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <div>
                                <div className="fw-bold">{file.name}</div>
                                {isSelected && (
                                  <small className="text-primary">
                                    <i className="fas fa-check-circle"></i> Đã chọn
                                  </small>
                                )}
                              </div>
                            )}
                          </td>
                          <td>{formatFileSize(file.size)}</td>
                          <td>
                            {formatDateDisplay(file.modified)}
                          </td>
                          <td>
                            {canManage && (
                              <div className="btn-group btn-group-sm">
                                <button
                                  className="btn btn-outline-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isDeleting) return;
                                    setRenamingFile(file.name);
                                    setNewFileName(file.name);
                                  }}
                                  title="Đổi tên"
                                  disabled={isDeleting}
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isDeleting) return;
                                    handleDeleteFile(file);
                                  }}
                                  title="Xóa"
                                  disabled={isDeleting}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="modal-footer flex-column align-items-stretch">
            <div className="d-flex justify-content-between align-items-center w-100 flex-wrap gap-3">
              <div className="text-muted small">
                Tổng: <span className="fw-bold">{totalFiles}</span> file{totalFiles !== 1 ? 's' : ''} • Trang <span className="fw-bold">{currentPage}</span> / {totalPages}
                {selectedFiles.size > 0 && ` • Đã chọn: ${selectedFiles.size}`}
              </div>
              
              {totalPages > 1 && (
                <nav aria-label="File manager pagination">
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => loadFiles(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                    </li>
                    
                    {[...Array(totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      // Logic to show limited page numbers
                      if (
                        pageNum === 1 || 
                        pageNum === totalPages || 
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                      ) {
                        return (
                          <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => loadFiles(pageNum)}
                              disabled={loading}
                            >
                              {pageNum}
                            </button>
                          </li>
                        );
                      } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                        return <li key={pageNum} className="page-item disabled"><span className="page-link">...</span></li>;
                      }
                      return null;
                    })}

                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => loadFiles(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
              
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  <i className="fas fa-times me-1"></i> Đóng
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirm}
                  disabled={selectedFiles.size === 0}
                >
                  <i className="fas fa-check me-1"></i> Chọn file{selectedFiles.size > 1 ? ` (${selectedFiles.size})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <style jsx>{`
      .file-card {
        transition: transform 0.2s, box-shadow 0.2s;
        border: 1px solid transparent !important;
      }
      .file-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
      }
      .file-card:hover .file-actions,
      .file-card.selected .file-actions {
        opacity: 1 !important;
      }
      .file-card.selected {
        background-color: rgba(13, 110, 253, 0.05);
        border: 1px solid rgba(13, 110, 253, 0.5) !important;
      }
      .btn-xs {
        padding: 0.1rem 0.3rem;
        font-size: 0.7rem;
        line-height: 1;
        border-radius: 0.2rem;
      }
    `}</style>
    </>
  );
}
