// User types
export interface User {
  id: string;
  userName: string;
  email: string;
  fullName?: string;
  createdDate?: Date;
  roles: string[];
}

// Department types
export interface Department {
  id: number;
  name: string;
}

// DeviceCategory types
export interface DeviceCategory {
  id: number;
  name: string;
  displayOrder?: number;
}

// Device types
export enum DeviceStatus {
  DangSuDung = 1,
  DangSuaChua = 2,
  HuHong = 3,
  DaThanhLy = 4
}

export interface Device {
  id: number;
  name: string;
  serial?: string;
  description?: string;
  img?: string;
  warrantyDate?: Date;
  useDate?: Date;
  endDate?: Date;
  departmentId: number;
  deviceCategoryId: number;
  status: DeviceStatus;
}

export interface DeviceVM extends Device {
  departmentName?: string;
  deviceCategoryName?: string;
  statusName?: string;
}

// Staff types
export interface Staff {
  id: number;
  name: string;
  email?: string; // Email for user account (required when creating)
  gender?: boolean;
  birthday?: Date;
  departmentId?: number;
  userId?: string; // Link to AspNetUsers.Id (auto-generated)
}

export interface StaffVM extends Staff {
  departmentName?: string;
}

// EventType types
export interface EventType {
  id: number;
  name: string;
}

// Event types
export interface Event {
  id: number;
  name?: string;
  deviceId?: number;
  eventTypeId?: number;
  description: string;
  img?: string;
  startDate?: Date;
  finishDate: Date;
  staffId?: number;
  notes: string;
  newDeviceStatus?: DeviceStatus;
}

export interface EventVM extends Event {
  deviceName?: string;
  eventTypeName?: string;
  staffName?: string;
}

// DamageReport types
export enum DamageReportStatus {
  Pending = 1,        // Chờ xử lý
  Assigned = 2,       // Đã phân công
  InProgress = 3,    // Đang xử lý
  Completed = 4,      // Hoàn thành
  Cancelled = 5,      // Đã hủy
  Rejected = 6       // Từ chối
}

export enum DamageReportPriority {
  Low = 1,           // Thấp
  Normal = 2,        // Bình thường
  High = 3,          // Cao
  Urgent = 4         // Khẩn cấp
}

export interface DamageReport {
  id: number;
  deviceId?: number;                    // OPTIONAL - Thiết bị nào bị hư hỏng
  damageLocation?: string;              // Vị trí/Mô tả hư hỏng khi không có device
  reporterId: number;                  // Nhân viên báo cáo
  reportingDepartmentId: number;      // Phòng ban báo cáo
  handlerId?: number;                   // Nhân viên được phân công xử lý
  assignedDate?: Date;                  // Ngày phân công
  reportDate: Date;                     // Ngày báo cáo
  handlingDate?: Date;                  // Ngày bắt đầu xử lý
  completedDate?: Date;                 // Ngày hoàn thành
  estimatedCompletionDate?: Date;       // Ngày dự kiến hoàn thành
  damageContent: string;                // Mô tả chi tiết hư hỏng
  images?: string[];                    // Mảng đường dẫn hình ảnh
  status: DamageReportStatus;          // Trạng thái
  priority: DamageReportPriority;       // Mức độ ưu tiên
  notes?: string;                       // Ghi chú chung
  handlerNotes?: string;                // Ghi chú của người xử lý
  rejectionReason?: string;             // Lý do từ chối/hủy
  createdBy?: string;                   // User tạo báo cáo
  updatedBy?: string;                   // User cập nhật cuối
  createdAt?: Date;                     // Thời gian tạo
  updatedAt?: Date;                     // Thời gian cập nhật cuối
}

export interface DamageReportVM extends DamageReport {
  deviceName?: string;
  deviceSerial?: string;
  deviceStatus?: DeviceStatus;
  reporterName?: string;
  reporterDepartmentName?: string;
  handlerName?: string;
  handlerDepartmentName?: string;
  statusName?: string;
  priorityName?: string;
  daysSinceReport?: number;
  daysInProgress?: number;
  isOverdue?: boolean;
  displayLocation?: string;              // Hiển thị: DeviceName hoặc damageLocation
  updatedByName?: string;                // Tên người cập nhật cuối
}

export interface DamageReportHistory {
  id: number;
  damageReportId: number;
  fieldName: string;
  oldValue?: string;
  newValue?: string;
  changedBy: string;
  changedAt: Date;
  changedByName?: string;               // Tên người thay đổi
}

// API Response types
export interface ApiResponse<T = any> {
  status: boolean;
  data?: T;
  error?: string;
  message?: string;
}

