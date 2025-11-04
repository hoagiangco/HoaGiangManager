'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import React from 'react';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { DeviceVM, DeviceStatus, DeviceCategory, Department } from '@/types';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import FileManager from '@/components/FileManager';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceVM[]>([]);
  const [allDevices, setAllDevices] = useState<DeviceVM[]>([]); // Store all devices from API
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<DeviceStatus | 0>(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Sort state
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Editor state
  const [showHtmlSource, setShowHtmlSource] = useState(false);
  const [htmlSource, setHtmlSource] = useState('');
  const [quillValue, setQuillValue] = useState(''); // Separate state for ReactQuill
  
  // File Manager state
  const [showFileManager, setShowFileManager] = useState(false);
  const [fileManagerMode, setFileManagerMode] = useState<'image' | 'all'>('image');
  const [fileManagerCallback, setFileManagerCallback] = useState<((url: string) => void) | null>(null);
  const fileManagerCallbackRef = useRef<((url: string) => void) | null>(null);
  const quillRef = useRef<any>(null);
  const pendingImageUrl = useRef<string | null>(null);
  const quillInsertIndex = useRef<number | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  
  // Define quillModules using useMemo at top level to avoid hook order violation
  const quillModules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: function(this: any) {
          console.log('Quill toolbar image handler triggered');
          // Open file manager for image selection
          setFileManagerMode('image');
          // Ensure no leftover pending URL accidentally updates image field
          pendingImageUrl.current = null;
          try {
            const editor = (quillRef as any).current?.getEditor?.() || (this as any).quill;
            if (editor) {
              editor.focus();
              const range = editor.getSelection(true) || { index: editor.getLength(), length: 0 };
              quillInsertIndex.current = range.index;
              console.log('Stored quillInsertIndex:', quillInsertIndex.current);
            } else {
              quillInsertIndex.current = null;
            }
          } catch (e) {
            console.warn('Unable to capture selection before opening FileManager:', e);
            quillInsertIndex.current = null;
          }
          const quillImageCallback = (url: string) => {
            console.log('Quill image handler received URL:', url);
            if (!url) return;
            
            // Lấy relative path từ URL
            let relativePath = url.trim();
            if (url.includes('://') || url.startsWith('http')) {
              try {
                const urlObj = new URL(url);
                relativePath = urlObj.pathname;
              } catch {
                relativePath = url.startsWith('/') ? url : `/${url}`;
              }
            } else {
              relativePath = url.startsWith('/') ? url : `/${url}`;
            }
            
            // Thêm img vào đúng vị trí con trỏ bằng Quill API và đồng bộ lại state
            const imgTag = `<img src="${relativePath}" alt="" />`;
            setTimeout(() => {
              try {
                const editor = (quillRef as any).current?.getEditor?.() || (this as any).quill;
                if (editor) {
                  // Prefer stored index to avoid lost selection after modal
                  const insertIndex = (typeof quillInsertIndex.current === 'number')
                    ? quillInsertIndex.current!
                    : editor.getLength();
                  editor.focus();
                  editor.insertEmbed(insertIndex, 'image', relativePath, 'user');
                  editor.setSelection(insertIndex + 1, 0);
                  quillInsertIndex.current = null;
                  const html = editor.root?.innerHTML || '';
                  setQuillValue(html);
                  setFormData((prev) => ({ ...prev, description: html }));
                } else {
                  // Fallback: append to end
                  setQuillValue((prev) => (prev ? prev + `<p>${imgTag}</p>` : `<p>${imgTag}</p>`));
                  setFormData((prev) => ({ ...prev, description: prev.description ? prev.description + `<p>${imgTag}</p>` : `<p>${imgTag}</p>` }));
                }
              } catch (e) {
                console.error('Error inserting image into Quill:', e);
              }
            }, 50);
          };
          setFileManagerCallback(quillImageCallback);
          fileManagerCallbackRef.current = quillImageCallback;
          setShowFileManager(true);
        }
      }
    }
  }), []); // Empty deps array since we're using state setters which are stable
  
  const [formData, setFormData] = useState({
    id: 0,
    name: '',
    serial: '',
    description: '',
    img: '',
    warrantyDate: '',
    useDate: '',
    endDate: '',
    departmentId: 0,
    deviceCategoryId: 0,
    status: DeviceStatus.DangSuDung,
  });
  
  // Debug: Log formData.img changes
  useEffect(() => {
    console.log('formData.img changed to:', formData.img);
  }, [formData.img]);
  
  // Handle pending image URL from FileManager
  useEffect(() => {
    if (pendingImageUrl.current) {
      const url = pendingImageUrl.current;
      pendingImageUrl.current = null;
      
      console.log('Processing pending image URL:', url);
      
      // Remove domain if present, keep only relative path
      let relativePath = url.trim();
      try {
        if (url.includes('://') || url.startsWith('http')) {
          const urlObj = new URL(url);
          relativePath = urlObj.pathname;
        } else {
          relativePath = url.startsWith('/') ? url : `/${url}`;
        }
      } catch (e) {
        relativePath = url.startsWith('/') ? url : `/${url}`;
      }
      
      console.log('Setting img from pending URL to:', relativePath);
      setFormData((prev) => {
        console.log('Updating formData.img from pending:', {
          from: prev.img,
          to: relativePath
        });
        return { ...prev, img: relativePath };
      });
    }
  }, [showFileManager]); // Trigger when modal closes
  const [isEdit, setIsEdit] = useState(false);

  useEffect(() => {
    loadCategories();
    loadDepartments();
    loadData();
  }, []);

  useEffect(() => {
    loadData();
    setCurrentPage(1); // Reset to first page when filters change
  }, [selectedCategory]);

  // Apply filters locally - no API call
  // Separate effect for department and status (immediate)
  useEffect(() => {
    let filteredDevices = [...allDevices];
    
    // Filter by department
    if (selectedDepartment > 0) {
      filteredDevices = filteredDevices.filter((d: DeviceVM) => d.departmentId === selectedDepartment);
    }
    
    // Filter by status
    if (selectedStatus > 0) {
      filteredDevices = filteredDevices.filter((d: DeviceVM) => d.status === selectedStatus);
    }
    
    // Apply search filter if exists
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.toLowerCase().trim();
      filteredDevices = filteredDevices.filter((d: DeviceVM) => 
        d.name?.toLowerCase().includes(keyword) ||
        d.serial?.toLowerCase().includes(keyword) ||
        d.description?.toLowerCase().includes(keyword) ||
        d.deviceCategoryName?.toLowerCase().includes(keyword) ||
        d.departmentName?.toLowerCase().includes(keyword)
      );
    }
    
    setDevices(filteredDevices);
    setCurrentPage(1);
  }, [allDevices, selectedDepartment, selectedStatus]);

  // Debounce search to avoid filtering on every keystroke
  useEffect(() => {
    if (!searchKeyword.trim()) {
      // If search is cleared, apply filters immediately
      let filteredDevices = [...allDevices];
      
      if (selectedDepartment > 0) {
        filteredDevices = filteredDevices.filter((d: DeviceVM) => d.departmentId === selectedDepartment);
      }
      
      if (selectedStatus > 0) {
        filteredDevices = filteredDevices.filter((d: DeviceVM) => d.status === selectedStatus);
      }
      
      setDevices(filteredDevices);
      setCurrentPage(1);
      return;
    }

    const timer = setTimeout(() => {
      let filteredDevices = [...allDevices];
      
      // Apply other filters first
      if (selectedDepartment > 0) {
        filteredDevices = filteredDevices.filter((d: DeviceVM) => d.departmentId === selectedDepartment);
      }
      
      if (selectedStatus > 0) {
        filteredDevices = filteredDevices.filter((d: DeviceVM) => d.status === selectedStatus);
      }
      
      // Then apply search
      const keyword = searchKeyword.toLowerCase().trim();
      filteredDevices = filteredDevices.filter((d: DeviceVM) => 
        d.name?.toLowerCase().includes(keyword) ||
        d.serial?.toLowerCase().includes(keyword) ||
        d.description?.toLowerCase().includes(keyword) ||
        d.deviceCategoryName?.toLowerCase().includes(keyword) ||
        d.departmentName?.toLowerCase().includes(keyword)
      );
      
      setDevices(filteredDevices);
      setCurrentPage(1);
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchKeyword, allDevices, selectedDepartment, selectedStatus]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/devices?cateId=${selectedCategory}`);
      if (response.data.status) {
        // Store all devices from API
        setAllDevices(response.data.data || []);
      } else {
        toast.error(response.data.error || 'Lỗi khi tải dữ liệu');
        setAllDevices([]);
      }
    } catch (error: any) {
      console.error('Load devices error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Lỗi khi tải dữ liệu';
      toast.error(errorMessage);
      setAllDevices([]);
    } finally {
      setLoading(false);
    }
  };


  const loadCategories = async () => {
    try {
      const response = await api.get('/device-categories');
      if (response.data.status) {
        setCategories(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error loading categories:', error);
      toast.error('Lỗi khi tải danh mục');
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await api.get('/departments');
      if (response.data.status) {
        setDepartments(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error loading departments:', error);
      toast.error('Lỗi khi tải phòng ban');
    }
  };

  const handleNew = () => {
    setIsEdit(false);
    setFormData({
      id: 0,
      name: '',
      serial: '',
      description: '',
      img: '',
      warrantyDate: '',
      useDate: '',
      endDate: '',
      departmentId: departments[0]?.id || 0,
      deviceCategoryId: categories[0]?.id || 0,
      status: DeviceStatus.DangSuDung,
    });
    setHtmlSource('');
    setQuillValue('');
    setShowHtmlSource(false);
    setFileManagerCallback(null);
    fileManagerCallbackRef.current = null;
    setShowImagePreview(false);
    setShowModal(true);
  };

  const handleEdit = () => {
    if (selectedIds.length !== 1) {
      toast.warning('Vui lòng chọn 1 thiết bị để sửa');
      return;
    }

    const device = devices.find((d) => d.id === selectedIds[0]);
    if (device) {
      setIsEdit(true);
      // Normalize image path to relative URL for consistent preview and storage
      let normalizedImg = device.img || '';
      try {
        if (normalizedImg) {
          if (normalizedImg.includes('://') || normalizedImg.startsWith('http')) {
            const u = new URL(normalizedImg);
            normalizedImg = u.pathname || '';
          } else {
            normalizedImg = normalizedImg.startsWith('/') ? normalizedImg : `/${normalizedImg}`;
          }
        }
      } catch {
        normalizedImg = normalizedImg.startsWith('/') ? normalizedImg : (normalizedImg ? `/${normalizedImg}` : '');
      }

      setFormData({
        id: device.id,
        name: device.name || '',
        serial: device.serial || '',
        description: device.description || '',
        img: normalizedImg,
        warrantyDate: device.warrantyDate ? format(new Date(device.warrantyDate), 'yyyy-MM-dd') : '',
        useDate: device.useDate ? format(new Date(device.useDate), 'yyyy-MM-dd') : '',
        endDate: device.endDate ? format(new Date(device.endDate), 'yyyy-MM-dd') : '',
        departmentId: device.departmentId,
        deviceCategoryId: device.deviceCategoryId,
        status: device.status,
      });
      setHtmlSource(device.description || '');
      setQuillValue(device.description || '');
      setShowHtmlSource(false);
      setFileManagerCallback(null);
      fileManagerCallbackRef.current = null;
      setShowImagePreview(false);
      setShowModal(true);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 thiết bị để xóa');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa các thiết bị đã chọn?')) {
      return;
    }

    try {
      for (const id of selectedIds) {
        const response = await api.delete(`/devices/${id}`);
        if (!response.data.status) {
          toast.error('Không thể xóa một số thiết bị đã được sử dụng');
          return;
        }
      }
      toast.success('Xóa thành công');
      setSelectedIds([]);
      loadData();
    } catch (error) {
      toast.error('Lỗi khi xóa thiết bị');
    }
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Vui lòng nhập tên thiết bị');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        serial: formData.serial || null,
        description: formData.description || null,
        img: formData.img || null,
        warrantyDate: formData.warrantyDate || null,
        useDate: formData.useDate || null,
        endDate: formData.endDate || null,
        departmentId: formData.departmentId,
        deviceCategoryId: formData.deviceCategoryId,
        status: formData.status,
      };

      if (isEdit) {
        await api.put(`/devices/${formData.id}`, { ...payload, id: formData.id });
        toast.success('Cập nhật thành công');
      } else {
        await api.post('/devices', payload);
        toast.success('Thêm mới thành công');
      }

      setShowModal(false);
      loadData();
    } catch (error) {
      toast.error(isEdit ? 'Lỗi khi cập nhật' : 'Lỗi khi thêm mới');
    }
  };

  const getStatusBadge = (status: DeviceStatus) => {
    const statusMap = {
      [DeviceStatus.DangSuDung]: { label: 'Đang sử dụng', class: 'badge bg-success' },
      [DeviceStatus.DangSuaChua]: { label: 'Đang sửa chữa', class: 'badge bg-warning' },
      [DeviceStatus.HuHong]: { label: 'Hư hỏng không dùng được', class: 'badge bg-danger' },
      [DeviceStatus.DaThanhLy]: { label: 'Đã thanh lý', class: 'badge bg-secondary' },
    };

    const statusInfo = statusMap[status] || { label: 'Không xác định', class: 'badge bg-light text-dark' };
    return <span className={`badge ${statusInfo.class}`} style={{ whiteSpace: 'nowrap' }}>{statusInfo.label}</span>;
  };

  // Sort and pagination calculations
  const sortedDevices = [...devices].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'serial':
        aValue = a.serial || '';
        bValue = b.serial || '';
        break;
      case 'warrantyDate':
        aValue = a.warrantyDate ? new Date(a.warrantyDate).getTime() : 0;
        bValue = b.warrantyDate ? new Date(b.warrantyDate).getTime() : 0;
        break;
      case 'useDate':
        aValue = a.useDate ? new Date(a.useDate).getTime() : 0;
        bValue = b.useDate ? new Date(b.useDate).getTime() : 0;
        break;
      case 'category':
        aValue = a.deviceCategoryName || '';
        bValue = b.deviceCategoryName || '';
        break;
      case 'department':
        aValue = a.departmentName || '';
        bValue = b.departmentName || '';
        break;
      case 'status':
        aValue = a.status || 0;
        bValue = b.status || 0;
        break;
      default:
        aValue = a.name || '';
        bValue = b.name || '';
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedDevices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDevices = sortedDevices.slice(startIndex, endIndex);

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <i className="fas fa-sort text-muted" style={{ fontSize: '0.8rem' }}></i>;
    }
    return sortDirection === 'asc' 
      ? <i className="fas fa-sort-up text-primary"></i>
      : <i className="fas fa-sort-down text-primary"></i>;
  };

  const getSortFieldLabel = (field: string) => {
    const labels: { [key: string]: string } = {
      name: 'Tên thiết bị',
      serial: 'Serial',
      warrantyDate: 'Bảo hành đến',
      useDate: 'Ngày sử dụng',
      category: 'Danh mục',
      department: 'Phòng ban',
      status: 'Trạng thái',
    };
    return labels[field] || field;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedIds([]); // Clear selection when changing page
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(currentDevices.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  // Reset sort when filters change
  useEffect(() => {
    setSortField('name');
    setSortDirection('asc');
  }, [selectedCategory]);

  if (loading) {
    return <div className="text-center">Đang tải...</div>;
  }

  return (
    <div className="container-fluid">
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="mb-0">THIẾT BỊ</h4>
            <div className="d-flex gap-2">
              <button className="btn btn-primary btn-sm" onClick={handleNew}>
                <i className="fas fa-plus"></i> Thêm mới
              </button>
              <button className="btn btn-success btn-sm" onClick={handleEdit}>
                <i className="fas fa-edit"></i> Sửa
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                <i className="fas fa-trash"></i> Xóa
              </button>
              <button className="btn btn-dark btn-sm" onClick={loadData}>
                <i className="fas fa-circle-notch"></i> Tải lại
              </button>
            </div>
          </div>
          
          {/* Filter Section */}
          <div className="card mb-3" style={{ backgroundColor: '#f8f9fa' }}>
            <div className="card-body py-2">
              <div className="row g-2 align-items-end">
                <div className="col-md-3">
                  <label className="form-label small mb-1">Tìm kiếm</label>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tên, serial, mô tả..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                    {searchKeyword && (
                      <button
                        className="btn btn-outline-secondary"
                        type="button"
                        onClick={() => setSearchKeyword('')}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-md-2">
                  <label className="form-label small mb-1">Danh mục</label>
                  <select
                    className="form-control form-control-sm"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(Number(e.target.value))}
                  >
                    <option value="0">Tất cả</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small mb-1">Phòng ban</label>
                  <select
                    className="form-control form-control-sm"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(Number(e.target.value))}
                  >
                    <option value="0">Tất cả</option>
                    {departments.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small mb-1">Trạng thái</label>
                  <select
                    className="form-control form-control-sm"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(Number(e.target.value) as DeviceStatus | 0)}
                  >
                    <option value="0">Tất cả</option>
                    <option value={DeviceStatus.DangSuDung}>Đang sử dụng</option>
                    <option value={DeviceStatus.DangSuaChua}>Đang sửa chữa</option>
                    <option value={DeviceStatus.HuHong}>Hư hỏng</option>
                    <option value={DeviceStatus.DaThanhLy}>Đã thanh lý</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <button
                    className="btn btn-secondary btn-sm w-100"
                    onClick={() => {
                      setSelectedCategory(0);
                      setSelectedDepartment(0);
                      setSelectedStatus(0);
                      setSearchKeyword('');
                    }}
                  >
                    <i className="fas fa-filter"></i> Xóa bộ lọc
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <span>Hiển thị:</span>
              <select
                className="form-control form-control-sm"
                style={{ width: '80px' }}
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
              <span>dòng/trang</span>
            </div>
            <div>
              <span>
                Hiển thị {sortedDevices.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, sortedDevices.length)} của {sortedDevices.length} thiết bị
                {(selectedCategory > 0 || selectedDepartment > 0 || selectedStatus > 0 || searchKeyword.trim()) && (
                  <span className="text-muted"> (đã lọc)</span>
                )}
                {sortField && (
                  <span className="text-muted ms-2">
                    <i className="fas fa-sort"></i> Sắp xếp: {getSortFieldLabel(sortField)} ({sortDirection === 'asc' ? 'Tăng dần' : 'Giảm dần'})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === currentDevices.length && currentDevices.length > 0 && selectedIds.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('name')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Tên thiết bị</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('serial')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Serial/mã nhận dạng</span>
                      {getSortIcon('serial')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('warrantyDate')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Bảo hành đến</span>
                      {getSortIcon('warrantyDate')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('useDate')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Ngày sử dụng</span>
                      {getSortIcon('useDate')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('category')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Danh mục</span>
                      {getSortIcon('category')}
                    </div>
                  </th>
                  <th 
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('department')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Phòng ban</span>
                      {getSortIcon('department')}
                    </div>
                  </th>
                  <th 
                    style={{ minWidth: '150px', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => handleSort('status')}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <span>Trạng thái</span>
                      {getSortIcon('status')}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentDevices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4">
                      <span className="text-muted">Không có dữ liệu</span>
                    </td>
                  </tr>
                ) : (
                  currentDevices.map((device) => (
                    <tr key={device.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(device.id)}
                          onChange={() => handleCheckboxChange(device.id)}
                        />
                      </td>
                      <td>{device.name}</td>
                      <td>{device.serial || '-'}</td>
                      <td>
                        {device.warrantyDate
                          ? format(new Date(device.warrantyDate), 'dd/MM/yyyy')
                          : '-'}
                      </td>
                      <td>
                        {device.useDate
                          ? format(new Date(device.useDate), 'dd/MM/yyyy')
                          : '-'}
                      </td>
                      <td>{device.deviceCategoryName}</td>
                      <td>{device.departmentName}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{getStatusBadge(device.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Page navigation" className="mt-3">
              <ul className="pagination justify-content-end">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <i className="fas fa-angle-left"></i> Trước
                  </button>
                </li>
                
                {/* First page */}
                {currentPage > 3 && (
                  <>
                    <li className="page-item">
                      <button className="page-link" onClick={() => handlePageChange(1)}>
                        1
                      </button>
                    </li>
                    {currentPage > 4 && (
                      <li className="page-item disabled">
                        <span className="page-link">...</span>
                      </li>
                    )}
                  </>
                )}
                
                {/* Page numbers around current page */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 2 && page <= currentPage + 2)
                  )
                  .map((page, index, array) => {
                    // Add ellipsis if there's a gap
                    const showEllipsisBefore = index > 0 && array[index - 1] < page - 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsisBefore && (
                          <li className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        )}
                        <li className={`page-item ${currentPage === page ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        </li>
                      </React.Fragment>
                    );
                  })}
                
                {/* Last page */}
                {currentPage < totalPages - 2 && (
                  <>
                    {currentPage < totalPages - 3 && (
                      <li className="page-item disabled">
                        <span className="page-link">...</span>
                      </li>
                    )}
                    <li className="page-item">
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </button>
                    </li>
                  </>
                )}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Sau <i className="fas fa-angle-right"></i>
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {isEdit ? 'Cập nhật thiết bị' : 'Thêm mới thiết bị'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-6">
                    <div className="form-group mb-3">
                      <label>Danh mục</label>
                      <select
                        className="form-control"
                        value={formData.deviceCategoryId}
                        onChange={(e) =>
                          setFormData({ ...formData, deviceCategoryId: Number(e.target.value) })
                        }
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group mb-3">
                      <label>Phòng ban</label>
                      <select
                        className="form-control"
                        value={formData.departmentId}
                        onChange={(e) =>
                          setFormData({ ...formData, departmentId: Number(e.target.value) })
                        }
                      >
                        {departments.map((dep) => (
                          <option key={dep.id} value={dep.id}>
                            {dep.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group mb-3">
                      <label>Tên thiết bị *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group mb-3">
                      <label>Serial (nếu có)</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.serial}
                        onChange={(e) => setFormData({ ...formData, serial: e.target.value })}
                      />
                    </div>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="form-group mb-3">
                          <label>Ngày hết BH</label>
                          <input
                            type="date"
                            className="form-control"
                            value={formData.warrantyDate}
                            onChange={(e) =>
                              setFormData({ ...formData, warrantyDate: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="form-group mb-3">
                          <label>Ngày sử dụng</label>
                          <input
                            type="date"
                            className="form-control"
                            value={formData.useDate}
                            onChange={(e) =>
                              setFormData({ ...formData, useDate: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="form-group mb-3">
                      <label>Hình ảnh</label>
                      <div className="input-group">
                        <input
                          type="text"
                          className="form-control"
                          value={formData.img || ''}
                          onChange={(e) => {
                            console.log('Input onChange:', e.target.value);
                            setFormData((prev) => ({ ...prev, img: e.target.value }));
                          }}
                          placeholder="Đường dẫn ảnh"
                          readOnly={false}
                        />
                        <button
                          type="button"
                          className="btn btn-outline-primary"
                          onClick={() => {
                            setFileManagerMode('image');
                            setFileManagerCallback((url: string) => {
                              if (!url) return;
                              
                              // Lấy relative path từ URL
                              let relativePath = url.trim();
                              if (url.includes('://') || url.startsWith('http')) {
                                try {
                                  const urlObj = new URL(url);
                                  relativePath = urlObj.pathname;
                                } catch {
                                  relativePath = url.startsWith('/') ? url : `/${url}`;
                                }
                              } else {
                                relativePath = url.startsWith('/') ? url : `/${url}`;
                              }
                              
                              // Đơn giản: chỉ cần set vào formData.img
                              setFormData((prev) => ({ ...prev, img: relativePath }));
                            });
                            fileManagerCallbackRef.current = (url: string) => {
                              if (!url) return;
                              let relativePath = url.trim();
                              if (url.includes('://') || url.startsWith('http')) {
                                try {
                                  const urlObj = new URL(url);
                                  relativePath = urlObj.pathname;
                                } catch {
                                  relativePath = url.startsWith('/') ? url : `/${url}`;
                                }
                              } else {
                                relativePath = url.startsWith('/') ? url : `/${url}`;
                              }
                              setFormData((prev) => ({ ...prev, img: relativePath }));
                            };
                            setShowFileManager(true);
                          }}
                          title="Chọn ảnh từ thư viện"
                        >
                          <i className="fas fa-image"></i> Chọn ảnh
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-info"
                          disabled={!formData.img}
                          onClick={() => setShowImagePreview((prev) => !prev)}
                          title={showImagePreview ? 'Ẩn ảnh' : 'Xem ảnh'}
                          aria-pressed={showImagePreview}
                        >
                          <i className={showImagePreview ? 'fas fa-eye' : 'fas fa-eye-slash'}></i>
                        </button>
                      </div>
                      {showImagePreview && formData.img && (
                        <div className="mt-2">
                          <div className="image-preview-box">
                            <img
                              src={formData.img}
                              alt="Preview"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                          <div className="image-preview-caption">{formData.img}</div>
                        </div>
                      )}
                    </div>
                    <div className="form-group mb-3">
                      <label>Trạng thái</label>
                      <select
                        className="form-control"
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: Number(e.target.value) as DeviceStatus })
                        }
                      >
                        <option value={DeviceStatus.DangSuDung}>Đang sử dụng</option>
                        <option value={DeviceStatus.DangSuaChua}>Đang sửa chữa</option>
                        <option value={DeviceStatus.HuHong}>Hư hỏng không dùng được</option>
                        <option value={DeviceStatus.DaThanhLy}>Đã thanh lý</option>
                      </select>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="form-group mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label>Mô tả</label>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => {
                            if (showHtmlSource) {
                              // Switching from HTML source to editor
                              const newDesc = htmlSource || '';
                              setFormData((prev) => ({ ...prev, description: newDesc }));
                              setQuillValue(newDesc);
                            } else {
                              // Switching from editor to HTML source
                              setHtmlSource(quillValue || '');
                            }
                            setShowHtmlSource(!showHtmlSource);
                          }}
                        >
                          <i className={`fas ${showHtmlSource ? 'fa-eye' : 'fa-code'}`}></i>
                          {showHtmlSource ? ' Xem Preview' : ' Xem HTML Source'}
                        </button>
                      </div>
                      {showHtmlSource ? (
                        <textarea
                          className="form-control"
                          rows={10}
                          value={htmlSource}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setHtmlSource(newValue);
                            setFormData((prev) => ({ ...prev, description: newValue }));
                            setQuillValue(newValue);
                          }}
                          style={{ 
                            fontFamily: 'monospace', 
                            fontSize: '0.9rem',
                            whiteSpace: 'pre-wrap'
                          }}
                          placeholder="Nhập HTML source code..."
                        />
                      ) : (
                        <div className="quill-editor">
                          <ReactQuill
                            key={`quill-${showModal}-${isEdit}`}
                            ref={quillRef}
                            theme="snow"
                            value={quillValue || ''}
                            onChange={(value) => {
                              // Ensure value is always a string
                              const safeValue = typeof value === 'string' ? value : '';
                              setQuillValue(safeValue);
                              setFormData((prev) => ({ ...prev, description: safeValue }));
                            }}
                            preserveWhitespace={false}
                            modules={quillModules}
                            formats={[
                              'header',
                              'bold', 'italic', 'underline', 'strike',
                              'list', 'bullet',
                              'color', 'background',
                              'align',
                              'link', 'image'
                            ]}
                            style={{ marginBottom: '16px' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                >
                  Lưu
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* File Manager Modal */}
      <FileManager
        isOpen={showFileManager}
        onClose={() => {
          setShowFileManager(false);
          setFileManagerCallback(null);
          fileManagerCallbackRef.current = null;
        }}
        onSelectFile={(url) => {
          console.log('FileManager onSelectFile called with:', url);
          if (!url) {
            console.log('URL is empty or null');
            setShowFileManager(false);
            setFileManagerCallback(null);
            return;
          }
          
          // Store callback before any state changes; prefer ref to avoid race
          const callback = fileManagerCallbackRef.current || fileManagerCallback;
          
          // Call callback immediately with URL to update appropriate target
          if (callback) {
            console.log('Calling fileManagerCallback with:', url);
            try {
              // Execute callback synchronously
              callback(url);
              console.log('Callback executed successfully');
              // Explicitly clear pending to ensure description-only insertions don't affect image field
              pendingImageUrl.current = null;
            } catch (error) {
              console.error('Error in fileManagerCallback:', error);
            }
          } else {
            console.error('No fileManagerCallback set! Using pending URL fallback.');
            // Only set pending URL when there is no specific callback
            pendingImageUrl.current = url;
          }
          
          // Close modal - this will trigger useEffect to process pending URL
          setShowFileManager(false);
          
          // Clear callback after delay
          setTimeout(() => {
            setFileManagerCallback(null);
            fileManagerCallbackRef.current = null;
          }, 500);
        }}
        mode={fileManagerMode}
        accept={fileManagerMode === 'image' ? 'image/*' : undefined}
        multiSelect={false}
      />
    </div>
  );
}

