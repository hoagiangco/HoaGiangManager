# Tóm Tắt Thiết Kế: Hệ Thống Quản Lý Báo Cáo Hư Hỏng Thiết Bị

## 📋 So Sánh: Bảng Mô Tả vs Model Đề Xuất

### ✅ Giữ Nguyên Từ Bảng Mô Tả
- Id, Người báo cáo, Phòng ban báo cáo, Người xử lý
- Ngày báo cáo, Ngày xử lý
- Nội dung hư hỏng, Hình ảnh, Ghi chú
- Trạng thái (mở rộng thành 6 trạng thái)

### 🆕 Bổ Sung Quan Trọng

#### 1. **Quan Hệ Với Thiết Bị** (OPTIONAL - Có thể là "Khác")
```typescript
deviceId?: number           // Thiết bị nào bị hư hỏng (OPTIONAL)
damageLocation?: string    // Vị trí/Mô tả hư hỏng khi không có device
```
- **Lý do**: Hư hỏng có thể không thuộc thiết bị cụ thể (hư hỏng tổng thể)
- **Tùy chọn "Khác"**: Nhập tự do `damageLocation` khi không chọn device
- **Validation**: Phải có `deviceId` HOẶC `damageLocation` (không được để trống cả 2)
- **Tự động**: Khi bắt đầu xử lý → Device.Status = "Đang sửa chữa" (chỉ nếu có device)
- **Lịch sử**: Xem tất cả báo cáo hư hỏng của một thiết bị (nếu có)

#### 2. **Trạng Thái Chi Tiết** (Thay vì chỉ 2 trạng thái)
```typescript
enum DamageReportStatus {
  Pending = 1,      // Chờ xử lý
  Assigned = 2,     // Đã phân công
  InProgress = 3,   // Đang xử lý
  Completed = 4,    // Hoàn thành
  Cancelled = 5,    // Đã hủy
  Rejected = 6      // Từ chối
}
```

#### 3. **Mức Độ Ưu Tiên**
```typescript
enum DamageReportPriority {
  Low = 1,      // Thấp
  Normal = 2,   // Bình thường
  High = 3,     // Cao
  Urgent = 4    // Khẩn cấp
}
```

#### 4. ~~**Quản Lý Chi Phí**~~ ❌ **ĐÃ LOẠI BỎ**
- Không cần quản lý chi phí, chỉ cần biết trạng thái khắc phục

#### 5. **Nhiều Hình Ảnh**
```typescript
images?: string[]  // Mảng đường dẫn (thay vì 1 hình)
```

#### 6. **Thời Gian Chi Tiết**
```typescript
assignedDate?: Date              // Ngày phân công
completedDate?: Date             // Ngày hoàn thành
estimatedCompletionDate?: Date   // Ngày dự kiến hoàn thành
```

#### 7. **Ghi Chú Chi Tiết**
```typescript
notes?: string           // Ghi chú chung
handlerNotes?: string    // Ghi chú của người xử lý
rejectionReason?: string // Lý do từ chối/hủy
```

## 🔄 Luồng Xử Lý (Workflow)

```
1. TẠO BÁO CÁO
   User → [Pending] → Thiết bị, Mô tả, Hình ảnh, Ưu tiên

2. PHÂN CÔNG
   Admin → [Assigned] → Chọn người xử lý, Ngày phân công

3. BẮT ĐẦU XỬ LÝ
   Handler → [InProgress] → Tự động cập nhật Device.Status = "Đang sửa chữa"

4. HOÀN THÀNH
   Handler → [Completed] → Cập nhật Device.Status, Chi phí thực tế

5. HỦY/TỪ CHỐI
   Admin/Handler → [Cancelled/Rejected] → Lý do
```

## 📊 Quan Hệ Với Model Hiện Có

```
DamageReport
├── Device (1 → N)           # Một thiết bị có nhiều báo cáo
├── Staff (Reporter) (1 → N)  # Một nhân viên có thể báo nhiều lần
├── Staff (Handler) (1 → N)  # Một nhân viên có thể xử lý nhiều báo cáo
└── Department (1 → N)        # Một phòng ban có nhiều báo cáo
```

## 🎯 Logic Tự Động Quan Trọng

### 1. **Cập Nhật Trạng Thái Thiết Bị**
- Khi bắt đầu xử lý → `Device.Status = "Đang sửa chữa"`
- Khi hoàn thành:
  - Nếu sửa thành công → `Device.Status = "Đang sử dụng"`
  - Nếu không sửa được → `Device.Status = "Hư hỏng"`

### 2. **Tính Toán Tự Động**
- `daysSinceReport`: Số ngày từ khi báo cáo
- `daysInProgress`: Số ngày đang xử lý
- `isOverdue`: Quá hạn nếu quá `estimatedCompletionDate`

### 3. **Validation**
- Device phải tồn tại
- Người xử lý phải là Staff hợp lệ
- Ngày báo cáo ≤ Ngày xử lý ≤ Ngày hoàn thành

## 📝 Model Đầy Đủ (TypeScript)

```typescript
export enum DamageReportStatus {
  Pending = 1,        // Chờ xử lý
  Assigned = 2,       // Đã phân công
  InProgress = 3,    // Đang xử lý
  Completed = 4,     // Hoàn thành
  Cancelled = 5,     // Đã hủy
  Rejected = 6       // Từ chối
}

export enum DamageReportPriority {
  Low = 1,
  Normal = 2,
  High = 3,
  Urgent = 4
}

export interface DamageReport {
  id: number;
  deviceId?: number;                    // OPTIONAL - Có thể null nếu là "Khác"
  damageLocation?: string;              // Vị trí/Mô tả khi không có device
  reporterId: number;
  reportingDepartmentId: number;
  handlerId?: number;
  assignedDate?: Date;
  reportDate: Date;
  handlingDate?: Date;
  completedDate?: Date;
  estimatedCompletionDate?: Date;
  damageContent: string;
  images?: string[];
  status: DamageReportStatus;
  priority: DamageReportPriority;
  notes?: string;
  handlerNotes?: string;
  rejectionReason?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DamageReportVM extends DamageReport {
  deviceName?: string;
  deviceSerial?: string;
  reporterName?: string;
  reporterDepartmentName?: string;
  handlerName?: string;
  handlerDepartmentName?: string;
  statusName?: string;
  priorityName?: string;
  daysSinceReport?: number;
  daysInProgress?: number;
  isOverdue?: boolean;
  displayLocation?: string;  // Hiển thị: DeviceName hoặc damageLocation
}
```

## 🗄️ Database Schema Tóm Tắt

```sql
CREATE TABLE "DamageReport" (
  "ID" SERIAL PRIMARY KEY,
  "DeviceID" INTEGER,                    -- OPTIONAL - NULL nếu là "Khác"
  "DamageLocation" VARCHAR(200),         -- Vị trí/Mô tả khi không có device
  "ReporterID" SMALLINT NOT NULL,
  "ReportingDepartmentID" SMALLINT NOT NULL,
  "HandlerID" SMALLINT,
  "AssignedDate" DATE,
  "ReportDate" DATE NOT NULL,
  "HandlingDate" DATE,
  "CompletedDate" DATE,
  "EstimatedCompletionDate" DATE,
  "DamageContent" TEXT NOT NULL,
  "Images" JSONB,                        -- Mảng JSON
  "Status" damage_report_status NOT NULL,
  "Priority" damage_report_priority NOT NULL,
  "Notes" TEXT,
  "HandlerNotes" TEXT,
  "RejectionReason" TEXT,
  "CreatedBy" TEXT,
  "UpdatedBy" TEXT,
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (("DeviceID" IS NOT NULL) OR ("DamageLocation" IS NOT NULL AND "DamageLocation" != ''))
);
```

## ✅ Checklist Trước Khi Triển Khai

- [x] Model đã được thiết kế đầy đủ
- [x] Luồng xử lý đã được xác định
- [x] Quan hệ với các model khác đã rõ
- [x] Logic tự động đã được mô tả
- [ ] Xác nhận với người dùng về thiết kế
- [ ] Bắt đầu triển khai

---

**Xem chi tiết đầy đủ**: `docs/DAMAGE_REPORT_DESIGN.md`

