/**
 * PREVIEW: Model và Types cho DamageReport
 * Copy vào types/index.ts sau khi xác nhận
 */

// ============================================
// ENUMS
// ============================================

export enum DamageReportStatus {
  Pending = 1,        // Chờ xử lý (mới báo cáo)
  Assigned = 2,       // Đã phân công (đã có người xử lý)
  InProgress = 3,    // Đang xử lý
  Completed = 4,      // Hoàn thành
  Cancelled = 5,      // Đã hủy
  Rejected = 6       // Từ chối (không hợp lệ)
}

export enum DamageReportPriority {
  Low = 1,           // Thấp
  Normal = 2,        // Bình thường
  High = 3,          // Cao
  Urgent = 4         // Khẩn cấp
}

// ============================================
// INTERFACES
// ============================================

export interface DamageReport {
  id: number;
  
  // Quan hệ với thiết bị (OPTIONAL - có thể là "Khác")
  deviceId?: number;                    // Thiết bị nào bị hư hỏng (null nếu là "Khác")
  damageLocation?: string;              // Vị trí/Mô tả hư hỏng khi không có device
  
  // Người báo cáo
  reporterId: number;                  // Nhân viên báo cáo
  reportingDepartmentId: number;      // Phòng ban báo cáo
  
  // Người xử lý
  handlerId?: number;                   // Nhân viên được phân công xử lý
  assignedDate?: Date;                  // Ngày phân công
  
  // Thời gian
  reportDate: Date;                     // Ngày báo cáo
  handlingDate?: Date;                  // Ngày bắt đầu xử lý
  completedDate?: Date;                 // Ngày hoàn thành
  estimatedCompletionDate?: Date;       // Ngày dự kiến hoàn thành
  
  // Nội dung
  damageContent: string;                // Mô tả chi tiết hư hỏng
  images?: string[];                    // Mảng đường dẫn hình ảnh
  
  // Trạng thái và phân loại
  status: DamageReportStatus;          // Trạng thái
  priority: DamageReportPriority;       // Mức độ ưu tiên
  
  // Ghi chú
  notes?: string;                       // Ghi chú chung
  handlerNotes?: string;                // Ghi chú của người xử lý
  rejectionReason?: string;             // Lý do từ chối/hủy
  
  // Metadata
  createdBy?: string;                   // User tạo báo cáo
  updatedBy?: string;                   // User cập nhật cuối
  createdAt?: Date;                     // Thời gian tạo
  updatedAt?: Date;                     // Thời gian cập nhật cuối
}

// ViewModel với thông tin liên quan (JOIN)
export interface DamageReportVM extends DamageReport {
  // Thông tin thiết bị (nếu có)
  deviceName?: string;
  deviceSerial?: string;
  deviceStatus?: number; // DeviceStatus
  
  // Thông tin người báo cáo
  reporterName?: string;
  reporterDepartmentName?: string;
  
  // Thông tin người xử lý
  handlerName?: string;
  handlerDepartmentName?: string;
  
  // Tên hiển thị
  statusName?: string;
  priorityName?: string;
  
  // Thống kê (calculated)
  daysSinceReport?: number;             // Số ngày từ khi báo cáo
  daysInProgress?: number;              // Số ngày đang xử lý
  isOverdue?: boolean;                  // Quá hạn chưa
  
  // Hiển thị
  displayLocation?: string;              // Hiển thị: DeviceName hoặc damageLocation
}

// ============================================
// HELPER FUNCTIONS (đề xuất)
// ============================================

export function getDamageReportStatusLabel(status: DamageReportStatus): string {
  const labels: { [key: number]: string } = {
    [DamageReportStatus.Pending]: 'Chờ xử lý',
    [DamageReportStatus.Assigned]: 'Đã phân công',
    [DamageReportStatus.InProgress]: 'Đang xử lý',
    [DamageReportStatus.Completed]: 'Hoàn thành',
    [DamageReportStatus.Cancelled]: 'Đã hủy',
    [DamageReportStatus.Rejected]: 'Từ chối',
  };
  return labels[status] || 'Không xác định';
}

export function getDamageReportPriorityLabel(priority: DamageReportPriority): string {
  const labels: { [key: number]: string } = {
    [DamageReportPriority.Low]: 'Thấp',
    [DamageReportPriority.Normal]: 'Bình thường',
    [DamageReportPriority.High]: 'Cao',
    [DamageReportPriority.Urgent]: 'Khẩn cấp',
  };
  return labels[priority] || 'Không xác định';
}

export function getDamageReportStatusBadgeClass(status: DamageReportStatus): string {
  const classes: { [key: number]: string } = {
    [DamageReportStatus.Pending]: 'badge bg-secondary',
    [DamageReportStatus.Assigned]: 'badge bg-info',
    [DamageReportStatus.InProgress]: 'badge bg-warning',
    [DamageReportStatus.Completed]: 'badge bg-success',
    [DamageReportStatus.Cancelled]: 'badge bg-dark',
    [DamageReportStatus.Rejected]: 'badge bg-danger',
  };
  return classes[status] || 'badge bg-light text-dark';
}

export function getDamageReportPriorityBadgeClass(priority: DamageReportPriority): string {
  const classes: { [key: number]: string } = {
    [DamageReportPriority.Low]: 'badge bg-secondary',
    [DamageReportPriority.Normal]: 'badge bg-primary',
    [DamageReportPriority.High]: 'badge bg-warning',
    [DamageReportPriority.Urgent]: 'badge bg-danger',
  };
  return classes[priority] || 'badge bg-light text-dark';
}

// ============================================
// WORKFLOW LOGIC
// ============================================

/**
 * Kiểm tra xem có thể chuyển từ trạng thái này sang trạng thái khác không
 */
export function canTransitionStatus(
  from: DamageReportStatus,
  to: DamageReportStatus
): boolean {
  const transitions: { [key: number]: DamageReportStatus[] } = {
    [DamageReportStatus.Pending]: [
      DamageReportStatus.Assigned,
      DamageReportStatus.Cancelled,
      DamageReportStatus.Rejected
    ],
    [DamageReportStatus.Assigned]: [
      DamageReportStatus.InProgress,
      DamageReportStatus.Cancelled,
      DamageReportStatus.Rejected
    ],
    [DamageReportStatus.InProgress]: [
      DamageReportStatus.Completed,
      DamageReportStatus.Cancelled
    ],
    [DamageReportStatus.Completed]: [], // Không thể chuyển từ Completed
    [DamageReportStatus.Cancelled]: [], // Không thể chuyển từ Cancelled
    [DamageReportStatus.Rejected]: [],  // Không thể chuyển từ Rejected
  };
  
  return transitions[from]?.includes(to) || false;
}

/**
 * Tính số ngày từ khi báo cáo
 */
export function calculateDaysSinceReport(reportDate: Date): number {
  const today = new Date();
  const diffTime = today.getTime() - new Date(reportDate).getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Kiểm tra xem có quá hạn không
 */
export function isOverdue(
  estimatedCompletionDate?: Date,
  status?: DamageReportStatus
): boolean {
  if (!estimatedCompletionDate) return false;
  if (status === DamageReportStatus.Completed || 
      status === DamageReportStatus.Cancelled || 
      status === DamageReportStatus.Rejected) {
    return false;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const estimated = new Date(estimatedCompletionDate);
  estimated.setHours(0, 0, 0, 0);
  
  return today > estimated;
}

