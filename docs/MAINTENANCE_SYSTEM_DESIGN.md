# HỆ THỐNG BẢO TRÌ VÀ THÔNG BÁO

## 📋 Tổng Quan

Hệ thống bảo trì cho phép đặt lịch bảo trì định kỳ cho các thiết bị hoặc nhóm thiết bị, tự động thông báo khi sắp đến hạn, và ghi nhận kết quả bảo trì. Hệ thống hỗ trợ cả bảo trì nội bộ và bảo trì thuê ngoài (outsource).

## 🎯 Mục Tiêu

1. **Đặt lịch bảo trì định kỳ** cho hệ thống nhiều thiết bị (ví dụ: tất cả máy lạnh công ty, bảo trì 1 năm 2 lần)
2. **Thông báo tự động** khi sắp đến hạn bảo trì
3. **Ghi nhận kết quả bảo trì** cho từng thiết bị
4. **Phân biệt nội bộ/outsource** mà không cần thêm trường mới vào bảng Device
5. **Quản lý lịch sử** bảo trì của từng thiết bị
6. **Hỗ trợ dời lịch và hủy** với lý do

## 🗄️ Cấu Trúc Dữ Liệu

### 1. DeviceReminderPlan (Kế hoạch nhắc nhở thiết bị)

Bảng này lưu trữ kế hoạch bảo trì định kỳ cho từng thiết bị.

```typescript
interface DeviceReminderPlan {
  id: number;
  deviceId: number;                    // ID thiết bị
  reminderType: EventCategory | 'custom'; // Loại nhắc nhở
  eventTypeId?: number | null;         // ID loại sự kiện (nếu có)
  title?: string | null;                // Tiêu đề kế hoạch
  description?: string | null;          // Mô tả
  intervalValue?: number | null;        // Giá trị khoảng thời gian (ví dụ: 6)
  intervalUnit?: 'day' | 'week' | 'month' | 'year' | null; // Đơn vị (ví dụ: 'month')
  cronExpression?: string | null;      // Biểu thức Cron (nếu dùng cron)
  startFrom?: Date | null;              // Ngày bắt đầu
  endAt?: Date | null;                  // Ngày kết thúc
  nextDueDate?: Date | null;            // Ngày đến hạn tiếp theo
  lastTriggeredAt?: Date | null;        // Ngày kích hoạt lần cuối
  isActive: boolean;                    // Trạng thái hoạt động
  metadata?: Record<string, any> | null; // Metadata linh hoạt
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}
```

#### Metadata Structure (ví dụ)

```json
{
  "maintenanceType": "internal" | "outsource",  // Loại bảo trì
  "maintenanceProvider": "Công ty ABC",          // Nhà cung cấp (nếu outsource)
  "cost": 500000,                                // Chi phí dự kiến
  "notes": "Ghi chú về bảo trì",
  "rescheduleHistory": [                        // Lịch sử dời lịch
    {
      "fromDate": "2024-01-15",
      "toDate": "2024-01-20",
      "reason": "Thiết bị đang sử dụng",
      "rescheduledBy": "user123",
      "rescheduledAt": "2024-01-10T10:00:00Z"
    }
  ],
  "cancelHistory": [                             // Lịch sử hủy
    {
      "cancelReason": "Thiết bị đã thanh lý",
      "cancelledBy": "user123",
      "cancelledAt": "2024-01-10T10:00:00Z"
    }
  ],
  "maintenanceBatchId": "batch-2024-01-15-001"  // ID batch cho hệ thống nhiều thiết bị
}
```

### 2. Event (Sự kiện)

Bảng này lưu trữ các sự kiện bảo trì đã thực hiện. Mỗi thiết bị sẽ có một Event riêng, nhưng các Event có thể được nhóm lại bằng `maintenanceBatchId` trong metadata.

```typescript
interface Event {
  id: number;
  title?: string | null;
  deviceId?: number | null;
  eventTypeId: number;
  description?: string | null;
  notes?: string | null;                // Ghi chú (không dùng nữa, để null)
  status: EventStatus;
  eventDate?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;                 // Tự động set khi status = Completed
  staffId?: number | null;
  relatedReportId?: number | null;
  metadata?: Record<string, any> | null;
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedBy?: string | null;
  updatedAt?: Date | null;
}
```

#### Event Metadata Structure (ví dụ)

```json
{
  "maintenanceBatchId": "batch-2024-01-15-001",  // ID batch để nhóm các event
  "maintenanceType": "internal" | "outsource",
  "maintenanceProvider": "Công ty ABC",
  "cost": 500000,
  "result": "Hoàn thành tốt",
  "rescheduleHistory": [...],
  "cancelHistory": [...]
}
```

## 🔄 Luồng Hoạt Động

### 1. Tạo Kế Hoạch Bảo Trì

#### 1.1. Bảo Trì Cho Một Thiết Bị

```
User → Chọn thiết bị
     → Chọn loại sự kiện (EventType)
     → Nhập khoảng thời gian (ví dụ: 6 tháng)
     → Nhập ngày bắt đầu
     → Chọn loại bảo trì (nội bộ/outsource) → Lưu vào metadata
     → Tạo DeviceReminderPlan
```

#### 1.2. Bảo Trì Cho Hệ Thống Nhiều Thiết Bị

```
User → Chọn nhiều thiết bị (theo category, department, hoặc danh sách ID)
     → Chọn loại sự kiện
     → Nhập khoảng thời gian
     → Nhập ngày bắt đầu
     → Chọn loại bảo trì → Lưu vào metadata
     → Tạo nhiều DeviceReminderPlan (mỗi thiết bị một plan)
     → Tất cả có cùng maintenanceBatchId trong metadata
```

**API Endpoint:** `POST /api/device-reminder-plans/bulk`

**Request Body:**
```json
{
  "deviceIds": [1, 2, 3],              // Hoặc
  "categoryId": 5,                     // Hoặc
  "departmentId": 2,                   // Hoặc
  "eventTypeId": 10,
  "title": "Bảo trì định kỳ máy lạnh",
  "description": "Bảo trì hệ thống máy lạnh công ty",
  "intervalValue": 6,
  "intervalUnit": "month",
  "startFrom": "2024-01-01",
  "endAt": "2025-12-31",
  "metadata": {
    "maintenanceType": "outsource",
    "maintenanceProvider": "Công ty ABC",
    "maintenanceBatchId": "batch-2024-01-15-001"
  }
}
```

### 2. Thông Báo Tự Động

**Scheduled Job:** `scripts/check-maintenance-reminders.ts`

Chạy hàng ngày (cron: `0 9 * * *`) để:
- Kiểm tra các `DeviceReminderPlan` có `nextDueDate` trong khoảng thời gian sắp tới (ví dụ: 7 ngày)
- Gửi thông báo cho người phụ trách
- Tự động tạo Event khi `nextDueDate` = hôm nay

**API Endpoint:** `GET /api/device-reminder-plans/upcoming?days=7&notificationDays=3,7`

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "deviceId": 5,
      "deviceName": "Máy lạnh phòng 101",
      "nextDueDate": "2024-01-22",
      "daysUntilDue": 3,
      "title": "Bảo trì định kỳ máy lạnh",
      "maintenanceType": "outsource"
    }
  ]
}
```

### 3. Tạo Event Khi Đến Hạn

Khi `nextDueDate` = hôm nay, hệ thống tự động:
- Tạo Event cho từng thiết bị với:
  - `status = Planned`
  - `eventDate = nextDueDate`
  - `metadata.maintenanceBatchId` = cùng batch ID
- Cập nhật `lastTriggeredAt` của DeviceReminderPlan
- Tính toán `nextDueDate` mới dựa trên `intervalValue` và `intervalUnit`

### 4. Hoàn Thành Bảo Trì

```
User → Chọn Event
     → Cập nhật status = Completed
     → Tự động set endDate = ngày hiện tại
     → Nhập kết quả bảo trì vào description hoặc metadata
     → Lưu
```

**Lưu ý:** Trường `notes` trong Event không được sử dụng nữa (luôn null).

### 5. Dời Lịch Bảo Trì

```
User → Chọn DeviceReminderPlan hoặc Event
     → Chọn "Dời lịch"
     → Nhập ngày mới
     → Nhập lý do (bắt buộc)
     → Lưu
```

**Metadata được cập nhật:**
```json
{
  "rescheduleHistory": [
    {
      "fromDate": "2024-01-15",
      "toDate": "2024-01-20",
      "reason": "Thiết bị đang sử dụng",
      "rescheduledBy": "user123",
      "rescheduledAt": "2024-01-10T10:00:00Z"
    }
  ]
}
```

### 6. Hủy Bảo Trì

```
User → Chọn DeviceReminderPlan hoặc Event
     → Chọn "Hủy"
     → Nhập lý do (bắt buộc)
     → Lưu
```

**Metadata được cập nhật:**
```json
{
  "cancelHistory": [
    {
      "cancelReason": "Thiết bị đã thanh lý",
      "cancelledBy": "user123",
      "cancelledAt": "2024-01-10T10:00:00Z"
    }
  ]
}
```

**DeviceReminderPlan:** Set `isActive = false`

**Event:** Set `status = Cancelled`

## 📡 API Endpoints

### 1. Tạo Kế Hoạch Bảo Trì Hàng Loạt

**POST** `/api/device-reminder-plans/bulk`

Tạo nhiều `DeviceReminderPlan` cho nhiều thiết bị cùng lúc.

**Request Body:**
```json
{
  "deviceIds": [1, 2, 3],              // Danh sách ID thiết bị (ưu tiên)
  "categoryId": 5,                     // Hoặc theo category (nếu không có deviceIds)
  "departmentId": 2,                   // Hoặc theo department (nếu không có deviceIds và categoryId)
  "eventTypeId": 10,
  "title": "Bảo trì định kỳ",
  "description": "Mô tả",
  "intervalValue": 6,
  "intervalUnit": "month",
  "startFrom": "2024-01-01",
  "endAt": "2025-12-31",
  "metadata": {
    "maintenanceType": "outsource",
    "maintenanceProvider": "Công ty ABC",
    "maintenanceBatchId": "batch-2024-01-15-001"
  }
}
```

**Response:**
```json
{
  "status": true,
  "data": {
    "created": 10,
    "plans": [1, 2, 3, ...]
  }
}
```

### 2. Lấy Danh Sách Kế Hoạch Sắp Đến Hạn

**GET** `/api/device-reminder-plans/upcoming?days=7&notificationDays=3,7`

**Query Parameters:**
- `days`: Số ngày trong tương lai để kiểm tra (mặc định: 7)
- `notificationDays`: Danh sách số ngày trước khi đến hạn để thông báo (ví dụ: "3,7")

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "deviceId": 5,
      "deviceName": "Máy lạnh phòng 101",
      "nextDueDate": "2024-01-22",
      "daysUntilDue": 3,
      "title": "Bảo trì định kỳ máy lạnh",
      "maintenanceType": "outsource"
    }
  ]
}
```

### 3. Lấy Tất Cả Event Của Một Batch

**GET** `/api/events/batch/:batchId`

Lấy tất cả Event có cùng `maintenanceBatchId`.

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "id": 10,
      "deviceId": 5,
      "deviceName": "Máy lạnh phòng 101",
      "status": "Completed",
      "eventDate": "2024-01-15",
      "endDate": "2024-01-15"
    }
  ]
}
```

### 4. Lấy Danh Sách Batch Bảo Trì

**GET** `/api/events/maintenance-batches`

Lấy danh sách tất cả batch bảo trì với thống kê.

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "batchId": "batch-2024-01-15-001",
      "title": "Bảo trì định kỳ máy lạnh",
      "totalDevices": 10,
      "completed": 8,
      "inProgress": 1,
      "planned": 1,
      "progressPercentage": 80
    }
  ]
}
```

### 5. Lấy Lịch Sử Event Của Một Thiết Bị

**GET** `/api/devices/:id/events`

Lấy tất cả Event liên quan đến một thiết bị.

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "id": 10,
      "title": "Bảo trì định kỳ",
      "eventDate": "2024-01-15",
      "endDate": "2024-01-15",
      "status": "Completed",
      "maintenanceBatchId": "batch-2024-01-15-001"
    }
  ]
}
```

## 🤖 Scheduled Job

### Script: `scripts/check-maintenance-reminders.ts`

**Mục đích:** Kiểm tra và xử lý các kế hoạch bảo trì sắp đến hạn.

**Chức năng:**
1. Lấy danh sách `DeviceReminderPlan` có `nextDueDate` trong khoảng thời gian sắp tới
2. Gửi thông báo cho các plan sắp đến hạn (dựa trên `notificationDays`)
3. Tự động tạo Event cho các plan có `nextDueDate` = hôm nay
4. Cập nhật `nextDueDate` mới cho các plan đã được kích hoạt

**Cron Schedule:** `0 9 * * *` (9 giờ sáng mỗi ngày)

**Cách chạy thủ công:**
```bash
npm run check-reminders
```

**package.json:**
```json
{
  "scripts": {
    "check-reminders": "npx tsx scripts/check-maintenance-reminders.ts"
  }
}
```

## 📝 Phân Biệt Nội Bộ/Outsource

Không thêm trường mới vào bảng `Device`. Thay vào đó, sử dụng `metadata` trong `DeviceReminderPlan` và `Event`:

```json
{
  "maintenanceType": "internal" | "outsource",
  "maintenanceProvider": "Công ty ABC",  // Chỉ có khi outsource
  "cost": 500000
}
```

## 🔍 Xem Lịch Sử Bảo Trì

### Theo Thiết Bị

Sử dụng API `/api/devices/:id/events` để xem tất cả Event (bao gồm bảo trì) của một thiết bị.

### Theo Batch

Sử dụng API `/api/events/batch/:batchId` để xem tất cả Event trong một batch bảo trì hệ thống.

## ✅ Checklist Triển Khai

- [x] Thiết kế cấu trúc dữ liệu
- [x] Xác định luồng hoạt động
- [ ] Tạo API endpoint `/api/device-reminder-plans/bulk`
- [ ] Tạo API endpoint `/api/device-reminder-plans/upcoming`
- [ ] Tạo API endpoint `/api/events/batch/:batchId`
- [ ] Tạo API endpoint `/api/events/maintenance-batches`
- [ ] Tạo API endpoint `/api/devices/:id/events`
- [ ] Tạo script `scripts/check-maintenance-reminders.ts`
- [ ] Thêm script vào `package.json`
- [ ] Thiết lập cron job trên server
- [ ] Tạo UI cho việc tạo kế hoạch bảo trì hàng loạt
- [ ] Tạo UI cho việc xem danh sách kế hoạch sắp đến hạn
- [ ] Tạo UI cho việc xem lịch sử bảo trì theo thiết bị
- [ ] Tạo UI cho việc xem batch bảo trì
- [ ] Tích hợp thông báo (email/notification)

## 📌 Lưu Ý Quan Trọng

1. **Event cho từng thiết bị:** Mỗi thiết bị sẽ có một Event riêng để có thể xem lại lịch sử của thiết bị dựa vào Event.

2. **Group bằng Batch ID:** Các Event của cùng một hệ thống bảo trì được nhóm lại bằng `maintenanceBatchId` trong metadata.

3. **Tự động set endDate:** Khi status của Event = Completed, hệ thống tự động set `endDate` = ngày hiện tại.

4. **Bỏ trường Notes:** Trường `notes` trong Event không được sử dụng nữa (luôn null).

5. **Dời/Hủy phải có lý do:** Khi dời lịch hoặc hủy, bắt buộc phải nhập lý do và lưu vào metadata.

6. **Metadata linh hoạt:** Sử dụng metadata để lưu thông tin bổ sung mà không cần thay đổi schema.

