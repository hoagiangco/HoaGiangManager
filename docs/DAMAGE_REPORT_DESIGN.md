# Thiết Kế Hệ Thống Quản Lý Báo Cáo Hư Hỏng Thiết Bị

## 1. Phân Tích Yêu Cầu

### 1.1. Mục Tiêu
- Quản lý báo cáo hư hỏng thiết bị từ các bộ phận
- Theo dõi đầy đủ trạng thái: ai báo, ai xử lý, khi nào, ở đâu
- Quản lý tiến độ xử lý (chưa hoàn thành / hoàn thành)
- Tích hợp với hệ thống quản lý thiết bị hiện có

### 1.2. Bảng Mô Tả Ban Đầu
1. Id
2. Người báo cáo (id staff)
3. Phòng ban báo cáo
4. Người sửa xử lý (id staff)
5. Ngày báo cáo
6. Ngày xử lý
7. Nội dung hư hỏng (text)
8. Hình ảnh
9. Trạng thái (Hoàn thành, chưa hoàn thành)
10. Ghi chú

## 2. Model Đề Xuất - DamageReport

### 2.1. TypeScript Interface

```typescript
// Trạng thái báo cáo hư hỏng
export enum DamageReportStatus {
  Pending = 1,        // Chờ xử lý (mới báo cáo)
  Assigned = 2,       // Đã phân công (đã có người xử lý)
  InProgress = 3,    // Đang xử lý
  Completed = 4,     // Hoàn thành
  Cancelled = 5,     // Đã hủy
  Rejected = 6       // Từ chối (không hợp lệ)
}

// Mức độ ưu tiên
export enum DamageReportPriority {
  Low = 1,           // Thấp
  Normal = 2,        // Bình thường
  High = 3,          // Cao
  Urgent = 4         // Khẩn cấp
}

// Model chính
export interface DamageReport {
  id: number;
  
  // Quan hệ với thiết bị (OPTIONAL - có thể là hư hỏng tổng thể)
  deviceId?: number;                    // Thiết bị nào bị hư hỏng (null nếu là "Khác")
  damageLocation?: string;              // Vị trí/Mô tả hư hỏng (khi không có device - tùy chọn "Khác")
  
  // Người báo cáo
  reporterId: number;                  // Nhân viên báo cáo
  reportingDepartmentId: number;      // Phòng ban báo cáo (có thể lấy từ Staff hoặc độc lập)
  
  // Người xử lý
  handlerId?: number;                   // Nhân viên được phân công xử lý
  assignedDate?: Date;                  // Ngày phân công (bổ sung)
  
  // Thời gian
  reportDate: Date;                     // Ngày báo cáo
  handlingDate?: Date;                  // Ngày bắt đầu xử lý
  completedDate?: Date;                 // Ngày hoàn thành (bổ sung)
  estimatedCompletionDate?: Date;       // Ngày dự kiến hoàn thành (bổ sung)
  
  // Nội dung
  damageContent: string;                // Mô tả chi tiết hư hỏng
  images?: string[];                    // Mảng đường dẫn hình ảnh (bổ sung - nhiều hình)
  
  // Trạng thái và phân loại
  status: DamageReportStatus;          // Trạng thái chi tiết (mở rộng)
  priority: DamageReportPriority;       // Mức độ ưu tiên (bổ sung)
  
  // Ghi chú và thông tin bổ sung
  notes?: string;                       // Ghi chú chung
  handlerNotes?: string;                // Ghi chú của người xử lý (bổ sung)
  rejectionReason?: string;             // Lý do từ chối (nếu Rejected) (bổ sung)
  
  // Metadata
  createdBy?: string;                   // User tạo báo cáo (bổ sung)
  updatedBy?: string;                   // User cập nhật cuối (bổ sung)
  createdAt?: Date;                     // Thời gian tạo (bổ sung)
  updatedAt?: Date;                      // Thời gian cập nhật cuối (bổ sung)
}

// ViewModel với thông tin liên quan
export interface DamageReportVM extends DamageReport {
  // Thông tin thiết bị (nếu có)
  deviceName?: string;
  deviceSerial?: string;
  deviceStatus?: DeviceStatus;
  
  // Thông tin người báo cáo
  reporterName?: string;
  reporterDepartmentName?: string;
  
  // Thông tin người xử lý
  handlerName?: string;
  handlerDepartmentName?: string;
  
  // Tên hiển thị
  statusName?: string;
  priorityName?: string;
  
  // Thống kê
  daysSinceReport?: number;             // Số ngày từ khi báo cáo
  daysInProgress?: number;              // Số ngày đang xử lý
  isOverdue?: boolean;                  // Quá hạn chưa (bổ sung)
  
  // Hiển thị
  displayLocation?: string;              // Hiển thị: DeviceName hoặc damageLocation
}
```

### 2.2. Database Schema (PostgreSQL)

```sql
-- Enum cho trạng thái
DO $$ BEGIN
  CREATE TYPE damage_report_status AS ENUM ('1', '2', '3', '4', '5', '6');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum cho mức độ ưu tiên
DO $$ BEGIN
  CREATE TYPE damage_report_priority AS ENUM ('1', '2', '3', '4');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Bảng DamageReport
CREATE TABLE IF NOT EXISTS "DamageReport" (
  "ID" SERIAL PRIMARY KEY,
  
  -- Quan hệ với thiết bị (OPTIONAL - có thể null nếu là "Khác")
  "DeviceID" INTEGER,
  FOREIGN KEY ("DeviceID") REFERENCES "Device"("ID") ON DELETE SET NULL,
  "DamageLocation" VARCHAR(200),  -- Vị trí/Mô tả khi không có device (tùy chọn "Khác")
  
  -- Người báo cáo
  "ReporterID" SMALLINT NOT NULL,
  FOREIGN KEY ("ReporterID") REFERENCES "Staff"("ID"),
  "ReportingDepartmentID" SMALLINT NOT NULL,
  FOREIGN KEY ("ReportingDepartmentID") REFERENCES "Department"("ID"),
  
  -- Người xử lý
  "HandlerID" SMALLINT,
  FOREIGN KEY ("HandlerID") REFERENCES "Staff"("ID"),
  "AssignedDate" DATE,
  
  -- Thời gian
  "ReportDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "HandlingDate" DATE,
  "CompletedDate" DATE,
  "EstimatedCompletionDate" DATE,
  
  -- Nội dung
  "DamageContent" TEXT NOT NULL,
  "Images" JSONB,  -- Lưu mảng JSON: ["/path1.jpg", "/path2.jpg"]
  
  -- Trạng thái và phân loại
  "Status" damage_report_status NOT NULL DEFAULT '1',
  "Priority" damage_report_priority NOT NULL DEFAULT '2',
  
  -- Ghi chú
  "Notes" TEXT,
  "HandlerNotes" TEXT,
  "RejectionReason" TEXT,
  
  -- Metadata
  "CreatedBy" TEXT,
  "UpdatedBy" TEXT,
  "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CHECK ("ReportDate" <= COALESCE("HandlingDate", CURRENT_DATE)),
  CHECK ("HandlingDate" IS NULL OR "HandlingDate" <= COALESCE("CompletedDate", CURRENT_DATE)),
  CHECK (("DeviceID" IS NOT NULL) OR ("DamageLocation" IS NOT NULL AND "DamageLocation" != ''))  -- Phải có device hoặc location
);

-- Indexes để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_damage_report_device ON "DamageReport"("DeviceID");
CREATE INDEX IF NOT EXISTS idx_damage_report_reporter ON "DamageReport"("ReporterID");
CREATE INDEX IF NOT EXISTS idx_damage_report_handler ON "DamageReport"("HandlerID");
CREATE INDEX IF NOT EXISTS idx_damage_report_status ON "DamageReport"("Status");
CREATE INDEX IF NOT EXISTS idx_damage_report_date ON "DamageReport"("ReportDate");
CREATE INDEX IF NOT EXISTS idx_damage_report_department ON "DamageReport"("ReportingDepartmentID");
```

## 3. Luồng Xử Lý (Workflow)

### 3.1. State Machine

```
[Pending] → [Assigned] → [InProgress] → [Completed]
    ↓           ↓             ↓
[Cancelled] [Rejected]  [Cancelled]
```

### 3.2. Các Trạng Thái Chi Tiết

1. **Pending (Chờ xử lý)**
   - Báo cáo mới được tạo
   - Chưa có người xử lý
   - Có thể chỉnh sửa hoặc hủy

2. **Assigned (Đã phân công)**
   - Đã có người xử lý được phân công
   - Có `handlerId` và `assignedDate`
   - Chưa bắt đầu xử lý

3. **InProgress (Đang xử lý)**
   - Đã bắt đầu xử lý
   - Có `handlingDate`
   - Thiết bị có thể được cập nhật status = "Đang sửa chữa"

4. **Completed (Hoàn thành)**
   - Đã hoàn thành xử lý
   - Có `completedDate`
   - Có thể cập nhật trạng thái thiết bị (nếu cần)
   - Có thể đánh giá chất lượng sửa chữa

5. **Cancelled (Đã hủy)**
   - Báo cáo bị hủy (không hợp lệ, trùng lặp, etc.)
   - Có thể có `rejectionReason`

6. **Rejected (Từ chối)**
   - Báo cáo bị từ chối xử lý
   - Có `rejectionReason`

### 3.3. Luồng Xử Lý Chi Tiết

```
1. TẠO BÁO CÁO (Pending)
   ├─ Người dùng báo cáo hư hỏng
   ├─ Nhập thông tin: 
   │   ├─ Chọn thiết bị HOẶC nhập "Khác" (damageLocation)
   │   ├─ Mô tả hư hỏng, hình ảnh, ưu tiên
   │   └─ Validation: Phải có deviceId HOẶC damageLocation
   └─ Tự động: ReportDate = today, Status = Pending

2. PHÂN CÔNG (Pending → Assigned)
   ├─ Admin/Manager phân công người xử lý
   ├─ Cập nhật: HandlerID, AssignedDate, Status = Assigned
   └─ Có thể gửi thông báo cho người xử lý

3. BẮT ĐẦU XỬ LÝ (Assigned → InProgress)
   ├─ Người xử lý nhận báo cáo và bắt đầu
   ├─ Cập nhật: HandlingDate, Status = InProgress
   ├─ Tự động cập nhật Device.Status = "Đang sửa chữa" (chỉ nếu có deviceId)
   └─ Có thể cập nhật EstimatedCompletionDate

4. HOÀN THÀNH (InProgress → Completed)
   ├─ Người xử lý hoàn thành
   ├─ Cập nhật: CompletedDate, HandlerNotes, Status = Completed
   ├─ Tự động cập nhật Device.Status (chỉ nếu có deviceId, tùy kết quả)
   └─ Xác nhận đã khắc phục xong

5. HỦY/TỪ CHỐI (Bất kỳ → Cancelled/Rejected)
   ├─ Cập nhật: RejectionReason, Status
   └─ Không cập nhật trạng thái thiết bị
```

## 4. Logic Xử Lý Tự Động

### 4.1. Khi Tạo Báo Cáo
- Tự động set `reportDate = today`
- Tự động set `status = Pending`
- Tự động set `priority = Normal` (nếu không chỉ định)
- Validate: 
  - Phải có `deviceId` HOẶC `damageLocation` (không được để trống cả 2)
  - Nếu có `deviceId`: Device phải tồn tại

### 4.2. Khi Phân Công
- Validate: Handler phải là Staff hợp lệ
- Set `assignedDate = today`
- Set `status = Assigned`
- Có thể gửi thông báo (email/notification)

### 4.3. Khi Bắt Đầu Xử Lý
- Set `handlingDate = today`
- Set `status = InProgress`
- **Tự động cập nhật Device.Status = "Đang sửa chữa"** (chỉ nếu có `deviceId`)
- Có thể set `estimatedCompletionDate`

### 4.4. Khi Hoàn Thành
- Set `completedDate = today`
- Set `status = Completed`
- **Tự động cập nhật Device.Status** (chỉ nếu có `deviceId`):
  - Nếu sửa thành công: "Đang sử dụng"
  - Nếu không sửa được: "Hư hỏng"

### 4.5. Tính Toán Tự Động
- `daysSinceReport`: Số ngày từ khi báo cáo
- `daysInProgress`: Số ngày đang xử lý
- `isOverdue`: Quá hạn nếu có `estimatedCompletionDate` và đã quá ngày

## 5. Quan Hệ Với Các Model Khác

### 5.1. Device (Thiết bị) - OPTIONAL
- **1 Device → N DamageReport**: Một thiết bị có thể có nhiều báo cáo hư hỏng (nếu có device)
- **Tự động cập nhật status**: Khi bắt đầu xử lý → "Đang sửa chữa" (chỉ nếu có device)
- **Lịch sử**: Có thể xem tất cả báo cáo hư hỏng của một thiết bị
- **Hư hỏng tổng thể**: Nếu không có device, sử dụng `damageLocation` để mô tả

### 5.2. Staff (Nhân viên)
- **Reporter**: Nhân viên báo cáo (1 → N)
- **Handler**: Nhân viên xử lý (1 → N)
- Có thể xem tất cả báo cáo của một nhân viên

### 5.3. Department (Phòng ban)
- **ReportingDepartment**: Phòng ban báo cáo
- Thống kê số lượng báo cáo theo phòng ban

## 6. Tính Năng Bổ Sung Đề Xuất

### 6.1. Thống Kê & Báo Cáo
- Số lượng báo cáo theo trạng thái
- Thời gian xử lý trung bình
- Thiết bị bị hư hỏng nhiều nhất
- Phòng ban có nhiều báo cáo nhất

### 6.2. Thông Báo
- Thông báo khi có báo cáo mới (cho Admin)
- Thông báo khi được phân công (cho Handler)
- Thông báo khi hoàn thành (cho Reporter)
- Thông báo quá hạn xử lý

### 6.3. Lọc & Tìm Kiếm
- Lọc theo: Trạng thái, Ưu tiên, Thiết bị, Phòng ban, Người xử lý
- Tìm kiếm: Tên thiết bị, Mô tả, Ghi chú
- Sắp xếp: Ngày báo cáo, Ưu tiên, Trạng thái

### 6.4. Phân Quyền
- **User thường**: Chỉ tạo và xem báo cáo của mình
- **Admin/Manager**: 
  - Xem tất cả báo cáo
  - Phân công người xử lý
  - Cập nhật trạng thái
  - Xóa báo cáo

## 7. API Endpoints Đề Xuất

```
GET    /api/damage-reports                    # Danh sách (có filter)
GET    /api/damage-reports/:id                # Chi tiết
POST   /api/damage-reports                    # Tạo mới
PUT    /api/damage-reports/:id                # Cập nhật
DELETE /api/damage-reports/:id                # Xóa
PUT    /api/damage-reports/:id/assign          # Phân công người xử lý
PUT    /api/damage-reports/:id/start          # Bắt đầu xử lý
PUT    /api/damage-reports/:id/complete       # Hoàn thành
PUT    /api/damage-reports/:id/cancel         # Hủy
GET    /api/damage-reports/stats              # Thống kê
GET    /api/damage-reports/by-device/:deviceId # Báo cáo theo thiết bị
GET    /api/damage-reports/by-staff/:staffId  # Báo cáo theo nhân viên
```

## 8. UI/UX Đề Xuất

### 8.1. Trang Danh Sách
- Bảng hiển thị với các cột: Thiết bị, Người báo, Người xử lý, Ngày báo, Trạng thái, Ưu tiên
- Filter sidebar: Trạng thái, Ưu tiên, Phòng ban, Thiết bị
- Badge màu cho trạng thái và ưu tiên
- Icon cảnh báo cho báo cáo quá hạn

### 8.2. Form Tạo/Sửa
- Tab 1: Thông tin cơ bản (Thiết bị*, Mô tả*, Hình ảnh, Ưu tiên)
- Tab 2: Phân công & Xử lý (Người xử lý, Ngày dự kiến)
- Tab 3: Ghi chú & Lịch sử
- Preview hình ảnh
- Validation real-time

### 8.3. Dashboard Widget
- Thống kê nhanh: Tổng số, Chờ xử lý, Đang xử lý, Hoàn thành
- Biểu đồ: Báo cáo theo tháng
- Danh sách báo cáo ưu tiên cao

## 9. So Sánh Với Bảng Mô Tả Ban Đầu

| Bảng Mô Tả | Model Đề Xuất | Cải Tiến |
|------------|---------------|----------|
| Id | id | ✅ Giữ nguyên |
| Người báo cáo (id staff) | reporterId | ✅ Giữ nguyên |
| Phòng ban báo cáo | reportingDepartmentId | ✅ Giữ nguyên |
| Người sửa xử lý (id staff) | handlerId | ✅ Giữ nguyên + thêm assignedDate |
| Ngày báo cáo | reportDate | ✅ Giữ nguyên |
| Ngày xử lý | handlingDate | ✅ Giữ nguyên + thêm completedDate |
| Nội dung hư hỏng (text) | damageContent | ✅ Giữ nguyên |
| Hình ảnh | images (array) | ✅ Mở rộng: hỗ trợ nhiều hình |
| Trạng thái (Hoàn thành/Chưa) | status (enum 6 trạng thái) | ✅ Chi tiết hơn |
| Ghi chú | notes + handlerNotes | ✅ Mở rộng: ghi chú riêng cho handler |
| - | **deviceId** | ✅ **BỔ SUNG QUAN TRỌNG** |
| - | **priority** | ✅ Bổ sung: mức độ ưu tiên |
| - | ~~**estimatedCost, actualCost**~~ | ❌ **ĐÃ LOẠI BỎ** - Không cần quản lý chi phí |
| - | **rejectionReason** | ✅ Bổ sung: lý do từ chối/hủy |
| - | **estimatedCompletionDate** | ✅ Bổ sung: ngày dự kiến |
| - | **metadata (createdBy, updatedAt...)** | ✅ Bổ sung: audit trail |

## 10. Kế Hoạch Triển Khai

### Phase 1: Core Features
1. ✅ Model & Database Schema
2. ✅ API Routes cơ bản (CRUD)
3. ✅ Service Layer
4. ✅ Component List & Form

### Phase 2: Workflow
1. ✅ State machine logic
2. ✅ Auto-update Device status
3. ✅ Assignment workflow
4. ✅ Completion workflow

### Phase 3: Advanced Features
1. Statistics & Reports
2. Notifications
3. Advanced filtering
4. Dashboard widgets

---

**Lưu ý**: Model này đã được thiết kế để tích hợp tốt với hệ thống hiện có và đảm bảo logic xử lý đầy đủ, minh bạch.

