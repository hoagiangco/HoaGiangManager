// User types
export interface User {
  id: string;
  userName: string;
  email: string;
  fullName?: string;
  createdDate?: Date;
  roles: string[];
  lockoutEnabled?: boolean;
  lockoutEnd?: Date | null;
  isLocked?: boolean;
}

// Department types
export interface Department {
  id: number;
  name: string;
}

// Location types
export interface Location {
  id: number;
  name: string;
  parentId?: number;
  parentName?: string;
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
  DaThanhLy = 4,
  CoHuHong = 5
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
  locationId?: number;
  deviceCategoryId: number;
  status: DeviceStatus;
  supplierId?: number;
}

export interface DeviceVM extends Device {
  departmentName?: string;
  locationName?: string;
  parentLocationName?: string;
  deviceCategoryName?: string;
  statusName?: string;
  lastReportStatus?: DamageReportStatus;
  lastReportContent?: string;
  lastReportId?: number;
  supplierName?: string;
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
export enum EventStatus {
  Planned = 'planned',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Missed = 'missed',
}

export type EventCategory = 'lifecycle' | 'maintenance' | 'warranty' | 'movement' | 'inspection' | 'other';

export interface EventType {
  id: number;
  name: string;
  code?: string | null;
  description?: string | null;
  category?: EventCategory | null;
  color?: string | null;
  isReminder?: boolean;
  defaultStatus?: EventStatus;
  defaultLeadTimeDays?: number | null;
}

// Event types
export interface Event {
  id: number;
  title?: string | null;
  deviceId?: number | null;
  eventTypeId: number;
  description?: string | null;
  notes?: string | null;
  status: EventStatus;
  eventDate?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
  staffId?: number | null;
  relatedReportId?: number | null;
  metadata?: Record<string, any> | null;
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

export interface EventVM extends Event {
  deviceName?: string | null;
  eventTypeName?: string | null;
  eventTypeCode?: string | null;
  staffName?: string | null;
  relatedReportCode?: string | null;
  relatedReportSummary?: string | null;
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
  afterImages?: string[];               // Mảng đường dẫn hình ảnh sau khi xử lý
  status: DamageReportStatus;          // Trạng thái
  priority: DamageReportPriority;       // Mức độ ưu tiên
  notes?: string;                       // Ghi chú chung
  handlerNotes?: string;                // Ghi chú của người xử lý
  rejectionReason?: string;             // Lý do từ chối/hủy
  maintenanceBatchId?: string;          // ID của batch bảo trì
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
  deviceLocationName?: string;           // Tên vị trí của thiết bị
  updatedByName?: string;                // Tên người cập nhật cuối
  afterImages?: string[];                // Mảng đường dẫn hình ảnh sau khi xử lý
  sourcePlanId?: number | null;
  sourcePlanDate?: string | null;
  isFromWorkPlan?: boolean;
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

export interface DeviceHistoryEntry {
  id: number;
  damageReportId: number;
  fieldName: string;
  fieldLabel: string;
  oldValue?: string | null;
  newValue?: string | null;
  changedBy?: string | null;
  changedByName?: string | null;
  changedAt: string;
}

export interface DeviceHistoryReport {
  reportId: number;
  reportDate?: string | null;
  completedDate?: string | null;
  status: DamageReportStatus;
  statusName: string;
  eventTypeName?: string | null;
  eventTypeCode?: string | null;
  damageContent?: string | null;
}

export interface DeviceHistoryEvent {
  id: number;
  title?: string | null;
  eventTypeName?: string | null;
  eventTypeCode?: string | null;
  eventTypeCategory?: EventCategory | null;
  status: EventStatus;
  statusLabel: string;
  eventDate?: string | null;
  reportedAt?: string | null;
  completedAt?: string | null;
  relatedReportId?: number | null;
  reportStatus?: DamageReportStatus | null;
  reportStatusName?: string | null;
  description?: string | null;
}

export interface DeviceHistorySummary {
  deviceId: number;
  deviceName?: string | null;
  deviceSerial?: string | null;
  totalReports: number;
  totalEvents: number;
  reports: DeviceHistoryReport[];
  events: DeviceHistoryEvent[];
}

export interface DeviceReminderPlan {
  id: number;
  deviceId: number;
  reminderType: EventCategory | 'custom';
  eventTypeId?: number | null;
  title?: string | null;
  description?: string | null;
  intervalValue?: number | null;
  intervalUnit?: 'day' | 'week' | 'month' | 'year' | null;
  cronExpression?: string | null;
  startFrom?: Date | null;
  endAt?: Date | null;
  nextDueDate?: Date | null;
  lastTriggeredAt?: Date | null;
  isActive: boolean;
  metadata?: Record<string, any> | null;
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

// API Response types
export interface ApiResponse<T = any> {
  status: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TimelineEntry {
  id: string;
  timestamp: string;
  author: string;
  content: string;
  type: 'manual' | 'auto' | 'legacy';
}

// Work Plan types
export interface WorkPlanDraftData {
  deviceId?: number;
  damageLocation?: string;
  damageContent: string;
  priority: DamageReportPriority;
  images?: string[];
  reporterId?: number;
  reportingDepartmentId?: number;
}

export interface WorkPlanItem {
  id: number;
  planDate?: string | null; // ISO Date string, null when stored in the plan archive
  staffId: number;
  damageReportId?: number | null;
  isNewTask: boolean;
  title: string;
  draftData?: WorkPlanDraftData | null;
  isImplemented: boolean;
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}

export interface WorkPlanItemVM extends WorkPlanItem {
  staffName?: string;
  reportStatus?: DamageReportStatus;
  reportStatusName?: string;
  deviceName?: string;
  location?: string;
  deptName?: string;
  damageContent?: string; // Full damage content from linked report
  maintenanceBatchId?: string;
  maintenanceTitle?: string;
  reportHandlerId?: number;
  reportHandlerName?: string;
}


// Spare Part types
export interface SparePartCategory {
  id: number;
  name: string;
  description?: string;
}

export interface SparePart {
  id: number;
  name: string;
  unit?: string;
  categoryId?: number;
  minQuantity: number;
  currentQuantity: number;
  description?: string;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SparePartVM extends SparePart {
  categoryName?: string;
  isLowStock?: boolean;
}

export enum SparePartTransactionType {
  In = 'IN',
  Out = 'OUT'
}

export interface SparePartTransaction {
  id: number;
  sparePartId: number;
  type: SparePartTransactionType;
  quantity: number;
  transactionDate: Date;
  note?: string;
  relatedReportId?: number;
  createdBy?: string;
  createdAt?: Date;
}

export interface SparePartTransactionVM extends SparePartTransaction {
  sparePartName?: string;
  sparePartUnit?: string;
  createdByName?: string;
  relatedReportCode?: string;
}
