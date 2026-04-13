# Kế hoạch triển khai: Chức năng nhắc việc & Thống kê tổng hợp

## Mô tả tổng quan
Kế hoạch này nhằm thực hiện hai yêu cầu chính:
1. Thêm chức năng nhắc việc (Task Reminder) để quản lý/admin đốc thúc các nhân sự đang xử lý công việc (sự cố/bảo trì) tránh tình trạng quên việc.
2. Xây dựng một trang "Thống kê tổng hợp" chuyên nghiệp, có thể thống kê nhiều module (Thiết bị, Báo cáo hư hỏng, Bảo trì) độc lập và xuất Excel với đầy đủ thao tác chọn cột, xem trước (sử dụng component ExportModal có sẵn để đảm bảo đồng bộ).

## Cảnh báo cho người dùng (User Review Required)
> [!IMPORTANT]
> **Về chức năng "Nhắc việc":** Nút nhắc việc sẽ gửi một "Push Notification" (Thông báo đẩy) và in-app notification cho nhân viên được phân công. Thông báo sẽ có nội dung mặc định (ví dụ: *"Quản lý đang yêu cầu bạn cập nhật tiến độ công việc #"*).
> **Về trang Thống kê tổng hợp:** Hiện tại hệ thống sẽ bao gồm 3 loại thống kê chính (Báo cáo hư hỏng, Hiện trạng Thiết bị, Bảo trì hệ thống). Bạn có muốn thêm các thông số cụ thể nào bắt buộc phải có trong tính năng thống kê không?

## Chi tiết kế hoạch

### API Backend

#### [NEW] `app/api/reports/remind/route.ts`
- Tạo API nhận HTTP POST request chứa `reportId`.
- Kiểm tra báo cáo có tồn tại, chưa Hoàn thành/Hủy, và đã được phân công (`handlerId` != null).
- Gọi `NotificationService` để tạo thông báo với loại `NotificationType.Report` và danh mục `NotificationCategory.Reminder` (đã có sẵn trong Enum của backend), nhắm tới `staffId` của người xử lý.

#### [NEW] `app/api/statistics/summary/route.ts`
- Tạo API trả về dữ liệu tổng hợp (KPI cards, số liệu thống kê) cho Dashboard Thống kê.
- Tính toán tổng số lượng thiết bị theo trạng thái, số lượng báo cáo theo trạng thái (từ ngày - đến ngày), và trạng thái bảo trì.

#### [NEW] `app/api/statistics/export/route.ts`
- API phục vụ việc preview và xuất Excel với `ExportModal`.
- Nhận biến `type` (reports | devices | maintenance) và các bộ lọc để trả về danh sách dữ liệu phẳng. Nó sẽ map các properties sang ngôn ngữ Tiếng Việt để xuất Excel chuyên nghiệp.

### Frontend UI

#### [MODIFY] `app/(dashboard)/dashboard/damage-reports/page.tsx`
- Thêm nút **"🔔 Nhắc việc"** vào khu vực action của từng thẻ report (hoặc bảng). Nút này chỉ hiển thị với các báo cáo đang ở trạng thái `Assigned` (Đã phân công) hoặc `InProgress` (Đang xử lý) và người dùng có quyền Admin hoặc là người tạo (Reporter).
- Khi bấm, thực hiện call API `/api/reports/remind` và hiển thị thông báo thành công (toast). Nút nhắc việc sẽ trigger 1 form điền tùy chỉnh hoặc dùng mặc định.

#### [NEW] `app/(dashboard)/dashboard/statistics/page.tsx`
- Tạo giao diện `Thống kê tổng hợp` chuyên dụng.
- Bao gồm các Tab hoặc phần cho từng nghiệp vụ:
  1. Thống kê Thiết bị
  2. Thống kê Sự cố/Hư hỏng
  3. Thống kê Bảo trì
- Tại mỗi tabs sẽ có các Card báo cáo nhanh tỷ lệ % và biểu đồ nếu cần thiết.
- Một nút lớn kết nối tới component `ExportModal`. Nó cung cấp giao diện lọc dữ liệu chuyên nghiệp (Từ ngày, Đến ngày, Phòng ban, Trạng thái) trước khi xuất Excel.

#### [MODIFY] `components/Sidebar.tsx` hoặc Component Navigation (Tùy cấu trúc hiện tại)
- Thêm menu "Thống kê" vào thanh điều hướng bên trái cho người dùng Admin.

## Open Questions (Câu hỏi mở)
> [!WARNING]
> 1. Đối với thông báo nhắc việc, bạn muốn tôi thêm luôn một hộp thoại nhỏ để người nhắc nhập lời nhắn tùy chọn (tự do nhập text), hay sử dụng một câu thông báo mặc định để thao tác nhanh chỉ với 1 click?
> 2. Trang Thống kê tổng hợp có nên cho phép Staff xem số liệu của phòng ban họ không, hay chỉ duy nhất Admin mới được truy cập? (Tôi tạm thời mặc định chỉ Admin).

## Verification Plan (Kế hoạch kiểm thử)

### Automated Tests/Script Run
- Gọi script API để kiểm tra tính năng push notifications tới tài khoản staff cụ thể.
- Kiểm tra Endpoint của statistics có trả đúng JSON flat object theo thời gian yêu cầu hay không.

### Manual Verification
- (USER) Sử dụng tài khoản admin click vào nút "Nhắc việc" trên một report đang được xử lý, kiểm tra xem nhân viên có nhận được notification không.
- Truy cập tính năng Thống kê, thao tác thay đổi điều kiện lọc, bấm nút "Xuất Excel" để kiểm tra tính chính xác của các cột dữ liệu sinh ra.
