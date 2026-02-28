# BÁO CÁO KIỂM TRA LỊCH BẢO TRÌ

**Ngày kiểm tra:** 14/11/2025  
**Người kiểm tra:** AI Assistant  
**Trạng thái:** ✅ Đã sửa lỗi

---

## 📋 Tổng Quan

Đã kiểm tra toàn bộ hệ thống lịch bảo trì, bao gồm:
- Logic tạo kế hoạch bảo trì
- Logic tính toán `nextDueDate`
- Script tự động tạo Event (`check-maintenance-reminders.ts`)
- API endpoints liên quan

---

## 🐛 Vấn Đề Đã Phát Hiện Và Sửa

### 1. **Lỗi Tính Toán `nextDueDate` Khi Tạo Kế Hoạch**

**Vấn đề:**
- Khi tạo kế hoạch bảo trì mới, `nextDueDate` được tính là `startFrom + interval`
- Điều này có nghĩa là lần bảo trì đầu tiên sẽ bị lùi một chu kỳ so với ngày bắt đầu

**Ví dụ:**
- `startFrom = 2024-01-01`
- `interval = 6 tháng`
- `nextDueDate` cũ = `2024-07-01` ❌ (sai)
- `nextDueDate` mới = `2024-01-01` ✅ (đúng)

**File bị ảnh hưởng:**
- `app/api/device-reminder-plans/bulk/route.ts` (dòng 132)

**Đã sửa:**
```typescript
// Trước (SAI):
const nextDueDate = calculateNextDueDate(startFromDate, intervalValue, intervalUnit);

// Sau (ĐÚNG):
const nextDueDate = new Date(startFromDate);
```

**Lý do:**
- Lần bảo trì đầu tiên nên diễn ra tại `startFrom`
- Các lần bảo trì tiếp theo sẽ được tính tự động bởi script `check-maintenance-reminders.ts` bằng cách cộng interval vào `nextDueDate` hiện tại

---

## ✅ Các Phần Đã Kiểm Tra Và Hoạt Động Đúng

### 1. **Script Tự Động Tạo Event** (`scripts/check-maintenance-reminders.ts`)

**Chức năng:**
- ✅ Tìm các kế hoạch có `nextDueDate` = hôm nay
- ✅ Tạo Event với status `Planned` cho từng thiết bị
- ✅ Tính toán `nextDueDate` mới = `nextDueDate hiện tại + interval`
- ✅ Tự động deactivate plan khi vượt quá `endAt`
- ✅ Xử lý transaction đúng cách (BEGIN/COMMIT/ROLLBACK)
- ✅ Đảm bảo Event sequence đúng

**Đã test:**
- Script chạy thành công
- Không có lỗi runtime

### 2. **API Endpoints**

#### `/api/device-reminder-plans/bulk` (POST)
- ✅ Validation đầy đủ
- ✅ Hỗ trợ tạo kế hoạch theo category, department, hoặc danh sách device IDs
- ✅ Tạo `maintenanceBatchId` tự động
- ✅ **Đã sửa:** `nextDueDate` = `startFrom` (không còn cộng interval)

#### `/api/device-reminder-plans/upcoming` (GET)
- ✅ Lọc kế hoạch sắp đến hạn đúng
- ✅ Tính toán `daysUntilDue` chính xác
- ✅ Hỗ trợ filter theo `notificationDays`

#### `/api/device-reminder-plans/[id]/reschedule` (POST)
- ✅ Cập nhật `nextDueDate` đúng
- ✅ Lưu lịch sử dời lịch vào metadata
- ✅ Validation đầy đủ (ngày mới, lý do)

#### `/api/device-reminder-plans/[id]/cancel` (POST)
- ✅ Deactivate plan (`isActive = false`)
- ✅ Lưu lịch sử hủy vào metadata
- ✅ Validation lý do hủy

### 3. **Service Layer** (`lib/services/deviceReminderPlanService.ts`)

- ✅ CRUD operations hoạt động đúng
- ✅ Parse metadata JSON đúng cách
- ✅ Xử lý null/undefined values

### 4. **UI Components** (`app/(dashboard)/dashboard/maintenance/page.tsx`)

- ✅ Form tạo kế hoạch đầy đủ
- ✅ Hiển thị danh sách kế hoạch sắp đến hạn
- ✅ Hiển thị batch bảo trì
- ✅ Modal dời lịch và hủy kế hoạch

---

## 🔍 Logic Tính Toán Ngày

### Khi Tạo Kế Hoạch Mới:
```
startFrom = 2024-01-01
interval = 6 tháng
→ nextDueDate = 2024-01-01 (lần bảo trì đầu tiên)
```

### Khi Script Tự Động Chạy (ngày 2024-01-01):
```
nextDueDate hiện tại = 2024-01-01
interval = 6 tháng
→ Tạo Event với eventDate = 2024-01-01
→ nextDueDate mới = 2024-01-01 + 6 tháng = 2024-07-01
```

### Khi Dời Lịch:
```
nextDueDate cũ = 2024-01-01
newDate = 2024-01-15
→ nextDueDate mới = 2024-01-15
→ Lưu lịch sử vào metadata.rescheduleHistory
```

---

## 📝 Khuyến Nghị

### 1. **Thiết Lập Cron Job**
- Script `check-maintenance-reminders.ts` nên được chạy tự động hàng ngày
- Khuyến nghị: 9 giờ sáng mỗi ngày (`0 9 * * *`)
- Xem hướng dẫn trong `docs/MAINTENANCE_SYSTEM_USAGE.md`

### 2. **Kiểm Tra Dữ Liệu Hiện Tại**
- Nếu có kế hoạch đã tạo trước khi sửa lỗi, có thể cần cập nhật `nextDueDate` thủ công
- Có thể chạy query SQL để kiểm tra:
```sql
SELECT 
  "ID",
  "DeviceID",
  "StartFrom",
  "NextDueDate",
  "IntervalValue",
  "IntervalUnit"
FROM "DeviceReminderPlan"
WHERE "IsActive" = true
  AND "NextDueDate" IS NOT NULL
  AND "NextDueDate" != "StartFrom"
ORDER BY "ID";
```

### 3. **Testing**
- Test tạo kế hoạch mới với các interval khác nhau (day, week, month, year)
- Test script tự động với kế hoạch có `nextDueDate` = hôm nay
- Test dời lịch và hủy kế hoạch

### 4. **Monitoring**
- Theo dõi log của script `check-maintenance-reminders.ts`
- Kiểm tra số lượng Event được tạo tự động
- Kiểm tra các plan bị deactivate do vượt quá `endAt`

---

## ✅ Checklist Hoàn Thành

- [x] Kiểm tra logic tính toán `nextDueDate` khi tạo kế hoạch
- [x] Sửa lỗi: `nextDueDate` đầu tiên = `startFrom`
- [x] Kiểm tra logic trong script `check-maintenance-reminders.ts`
- [x] Kiểm tra các API endpoints
- [x] Kiểm tra service layer
- [x] Kiểm tra UI components
- [x] Test script chạy thành công
- [x] Tạo báo cáo tổng hợp

---

## 📚 Tài Liệu Tham Khảo

- [Thiết Kế Hệ Thống](./MAINTENANCE_SYSTEM_DESIGN.md)
- [Hướng Dẫn Sử Dụng](./MAINTENANCE_SYSTEM_USAGE.md)
- [API Documentation](../app/api/device-reminder-plans/bulk/route.ts)
- [Scheduled Job Script](../scripts/check-maintenance-reminders.ts)

---

**Kết luận:** Hệ thống lịch bảo trì đã được kiểm tra và sửa lỗi quan trọng. Các phần còn lại hoạt động đúng như thiết kế. Khuyến nghị thiết lập cron job để script tự động chạy hàng ngày.




