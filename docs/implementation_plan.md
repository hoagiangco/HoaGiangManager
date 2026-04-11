# Quản lý Vị trí (Location) Chuyên nghiệp

Hệ thống sẽ được nâng cấp để quản lý danh mục **Vị trí (Location)** một cách chuyên nghiệp tương tự như Phòng ban. Điều này giúp đồng nhất dữ liệu và dễ dàng quản lý tài sản theo khu vực vật lý.

## User Review Required

> [!IMPORTANT]
> - Cần chạy các tệp Migration SQL để cập nhật cấu trúc cơ sở dữ liệu.
> - Sau khi cập nhật, trang quản lý Vật tư sẽ yêu cầu chọn Vị trí từ danh sách có sẵn (bắt buộc hoặc tùy chọn).

## Proposed Changes

### Database Layer

#### [NEW] [2026-04-11_create_location_table.sql](file:///e:/Web%20Project/Nextjs/HoaGiangManager/scripts/migrations/2026-04-11_create_location_table.sql)
- Tạo bảng `Location` với các cột: `ID` (Primary Key), `Name` (Text, Unique).
- Thêm cột `LocationID` vào bảng `Device` (Foreign Key đến `Location.ID`).

---

### Logic & Types Layer

#### [MODIFY] [types/index.ts](file:///e:/Web%20Project/Nextjs/HoaGiangManager/types/index.ts)
- Thêm interface `Location`.
- Cập nhật interface `Device` để bao gồm `locationId?: number`.
- Cập nhật interface `DeviceVM` để bao gồm `locationName?: string`.

#### [NEW] [lib/services/locationService.ts](file:///e:/Web%20Project/Nextjs/HoaGiangManager/lib/services/locationService.ts)
- Triển khai đầy đủ các hàm CRUD cho bảng `Location`.

#### [MODIFY] [lib/services/deviceService.ts](file:///e:/Web%20Project/Nextjs/HoaGiangManager/lib/services/deviceService.ts)
- Cập nhật các câu lệnh SQL JOIN để lấy thêm `locationName` từ bảng `Location`.
- Cập nhật logic `create` và `update` để lưu trữ `locationId`.

#### [NEW] [app/api/locations/route.ts](file:///e:/Web%20Project/Nextjs/HoaGiangManager/app/api/locations/route.ts) và `app/api/locations/[id]/route.ts`
- Tạo các endpoint API để giao tiếp với `LocationService`.

---

### UI Layer

#### [NEW] [app/(dashboard)/dashboard/locations/page.tsx](file:///e:/Web%20Project/Nextjs/HoaGiangManager/app/(dashboard)/dashboard/locations/page.tsx)
- Trang quản lý danh mục Vị trí (CRUD đầy đủ: Thêm, Sửa, Xóa, Tìm kiếm, Phân trang).

#### [MODIFY] [app/(dashboard)/layout.tsx](file:///e:/Web%20Project/Nextjs/HoaGiangManager/app/(dashboard)/layout.tsx)
- Thêm mục "Vị trí" vào Sidebar (thuộc nhóm Quản lý tài sản).

#### [MODIFY] [app/(dashboard)/dashboard/devices/page.tsx](file:///e:/Web%20Project/Nextjs/HoaGiangManager/app/(dashboard)/dashboard/devices/page.tsx)
- Bổ sung cột "Vị trí" vào bảng hiển thị vật tư.
- Thêm bộ chọn (Select/Dropdown) "Vị trí" trong modal Thêm/Sửa vật tư.
- **[QUAN TRỌNG]**: Thêm nút "+" bên cạnh dropdown Vị trí để mở modal "Thêm nhanh Vị trí", giúp người dùng tạo khu vực mới ngay lập tức mà không cần chuyển trang.
- Thêm bộ lọc theo Vị trí ở thanh công cụ.

---

## Open Questions

- Bạn có muốn đưa trường **Vị trí (Location)** vào bộ lọc tìm kiếm nhanh không? (Hiện tại tìm kiếm theo Tên và Serial).

## Verification Plan

### Automated Tests
- Chạy lệnh migration để cập nhật database: `npx ts-node scripts/run-migration.ts` (hoặc script tương ứng).

### Manual Verification
1. Truy cập trang Quản lý Vật tư.
2. Thêm một vật tư mới với thông tin Vị trí (ví dụ: "Khu vực Bếp").
3. Kiểm tra xem cột Vị trí có hiển thị đúng trong bảng không.
4. Thử chỉnh sửa Vị trí và lưu lại.
5. Kiểm tra xem khi xem lịch sử thiết bị có bị ảnh hưởng gì không (không nên ảnh hưởng).
