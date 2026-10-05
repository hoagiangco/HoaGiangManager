# Rà soát logic chức năng — 11/09/2026

## Phạm vi

Rà soát mã hiện tại trong workspace, gồm các thay đổi dev chưa commit: bảo trì/sự kiện, báo cáo công việc, trạng thái thiết bị, xác thực/tài khoản, sao lưu/phục hồi, kế hoạch công việc, lịch tuần và kho. Đây là rà soát có trọng tâm theo luồng và ranh giới dữ liệu, không phải xác nhận mọi nhánh trong toàn bộ hệ thống đã được kiểm thử.

Không sửa mã vận hành, không gọi API ghi dữ liệu, không chạy backup/restore/cron, không thay đổi database chung. Chỉ tạo báo cáo này. Các phép tái hiện dùng module thật được biên dịch trong bộ nhớ với database/service giả lập. Bộ test hiện có: 36/36 đạt.

P1: ưu tiên xử lý trước khi mở rộng chức năng. P2: xử lý tiếp sau để tăng tính nhất quán và độ tin cậy. Những điểm đã tái hiện được ghi riêng; các điểm còn lại là kết luận từ mã, chưa thử trên production.

## P1 — Các lỗi cần ưu tiên

### 1. Phân quyền sửa/tạo sự kiện phụ thuộc dữ liệu client

- Vị trí: `app/api/events/[id]/route.ts:53`, `app/api/events/route.ts:51`.
- Quyền thực hiện bảo trì được cho phép khi chuỗi metadata chứa `maintenanceBatchId`. Không yêu cầu khóa đó tồn tại đúng cấu trúc, không kiểm tra sự kiện đích có thực sự thuộc kế hoạch được phép thực hiện, không giới hạn trường mà người thực hiện có thể đổi.
- Tái hiện với route PUT thật và service giả: User gửi metadata có trường ghi chú chứa chuỗi này, cùng eventTypeId hợp lệ; route trả 200 và gọi service.update. Không cập nhật sự kiện thật.
- Hướng sửa: đọc bản ghi đích và kế hoạch từ DB, kiểm tra quyền trên đối tượng; tách thao tác thực hiện khỏi sửa thông tin quản trị; chỉ nhận các trường được phép cho từng thao tác.

### 2. Khóa tài khoản/đổi mật khẩu chưa thu hồi được phiên cũ

- Vị trí: `lib/auth/middleware.ts:34`, `lib/auth/jwt.ts:20`, `lib/services/userService.ts:279`.
- Middleware đọc người dùng và vai trò nhưng không kiểm LockoutEnabled/LockoutEnd. Token cũng không mang/đối chiếu phiên bản phiên hoặc SecurityStamp. Đổi SecurityStamp khi reset mật khẩu vì thế không vô hiệu token đã phát hành.
- Tái hiện middleware thật với DB giả trả tài khoản khóa đến 2099: token được xác minh vẫn cho ra user hợp lệ.
- Hướng sửa: kiểm tra khóa ở mỗi request; đối chiếu phiên bản phiên hoặc thời điểm thu hồi. Test khóa khi đang đăng nhập, mở khóa, reset mật khẩu và token hết hạn.

### 3. Đồng bộ báo cáo có thể tác động nhiều kỳ bảo trì khác nhau

- Vị trí: `lib/services/damageReportService.ts:1576`.
- Cập nhật sự kiện theo maintenanceBatchId và RelatedReportID IS NULL, không ràng buộc ngày kỳ, maintenancePlanId/scheduledDueDate hoặc trạng thái. Comment nói sự kiện chưa hoàn thành nhưng SQL không có điều kiện này.
- Tình huống: một nhóm có sự kiện chưa liên kết của hai kỳ khác nhau; hoàn thành một báo cáo có thể gán cả hai vào báo cáo đó và đổi trạng thái cả hai. Đặc biệt cần chú ý vì cron mới có thể tạo nhiều kỳ bị bỏ lỡ.
- Hướng sửa: liên kết theo định danh kỳ và thiết bị cụ thể. Test hai kỳ cùng nhóm, một kỳ đã hoàn thành và một kỳ tương lai. Bộ tính chu kỳ có neo vừa sửa không tự giải quyết lỗi liên kết kỳ này.

### 4. Báo cáo và bảo trì đồng bộ hai lần, không chung giao dịch

- Vị trí: `app/api/damage-reports/[id]/status/route.ts:131` và `:161`; `lib/services/damageReportService.ts:1117`.
- updateStatus commit báo cáo/thiết bị rồi tự gọi syncMaintenanceBatchEvents. Route sau đó lại gọi syncMaintenanceBatchEvents với thông tin bổ sung. Các bước ghi ghi chú, ảnh, sự kiện và lịch còn nằm ngoài transaction báo cáo.
- Hệ quả: lỗi đồng bộ có thể xảy ra sau khi báo cáo đã lưu; client nhận lỗi nhưng trạng thái đã đổi. Một thao tác có thể chạy thông báo/đồng bộ lặp. Nhánh cập nhật ngày hoàn thành cũng gán lại ngày hiện tại khi gửi lại Completed.
- Hướng sửa: một service điều phối toàn bộ chuyển trạng thái, kiểm soát chuyển trạng thái hợp lệ và yêu cầu gửi lại; thông báo sau commit hoặc qua hàng đợi. Test lỗi từng bước và hai request đồng thời.

### 5. Trạng thái thiết bị được chọn khi hoàn thành bị ghi đè

- Vị trí: `lib/services/damageReportService.ts:1109` và `:1729`.
- updateStatus ghi finalDeviceStatus, rồi ngay sau đó syncDeviceStatus tính lại thành Đang sử dụng/Có hư hỏng/Đang sửa chữa từ các báo cáo, ghi đè lựa chọn trước.
- Tình huống: chọn thiết bị Hư hỏng sau xử lý, không còn báo cáo mở; hệ thống có thể đưa về Đang sử dụng.
- Hướng sửa: quy định thứ tự ưu tiên giữa trạng thái vòng đời do quản trị đặt và trạng thái phát sinh từ công việc; không dùng một hàm suy diễn để ghi đè mọi loại trạng thái.

### 6. Sao lưu/phục hồi chưa kiểm soát đủ đầu vào và tính đầy đủ của bản sao

- Vị trí: `lib/services/backupService.ts:173`, `:189`, `:225`, `:256`.
- name từ request được nối vào đường dẫn rồi dùng cho xóa/ghi file và chuỗi lệnh shell; chưa xác minh đường dẫn nằm trong thư mục backup. URL phục hồi chấp nhận địa chỉ HTTP do client cung cấp, chưa ràng buộc vào bản sao được hệ thống quản lý.
- Có cấu hình Blob thì upload backup với access public (`:99`). Đây là đường truy cập bản sao dữ liệu ngoài lớp đăng nhập của ứng dụng; chưa kiểm tra cấu hình Blob production có bật hay không.
- Nhánh JS backup đọc từng bảng không dùng snapshot nhất quán, không xuất schema/sequence, sinh TRUNCATE CASCADE và INSERT xen kẽ theo danh sách bảng không có thứ tự phụ thuộc. Phục hồi có thể lỗi khóa ngoại hoặc xóa dữ liệu bảng phụ đã nạp trước. Nhánh tạo backup trước restore có lỗi vẫn tiếp tục restore.
- Hướng sửa: chọn backup theo ID server, xác minh đường dẫn/nguồn, dùng execFile với mảng tham số, lưu bản sao riêng tư, kiểm tra khả năng phục hồi trên bản thử. Phân biệt bản sao chỉ dữ liệu với bản sao đủ để phục hồi toàn bộ. Chưa chạy chức năng nguy hiểm này để kiểm chứng trên DB chung.

### 7. Sai mã lỗi/quyền có thể gây logout dù phiên vẫn hợp lệ

- Vị trí: `app/api/admin/backup/route.ts:13`, `lib/utils/api.ts:34`, `lib/auth/middleware.ts:78`.
- GET/POST/PATCH backup kiểm tra đúng tên vai trò Admin, không chấp nhận tài khoản chỉ có SuperAdmin, rồi trả 401. Client xóa token cho 401. Tái hiện GET route thật với SuperAdmin giả: 401.
- Lỗi DB trong authenticate cũng trở thành user=null, bị các guard chuyển thành 401 thay vì lỗi hệ thống tạm thời. Đây là cơ chế khác vẫn có thể gây logout sau bản sửa thiếu cột trước đây.
- Hướng sửa: dùng quyền thống nhất; 401 cho xác thực không hợp lệ, 403 cho không đủ quyền, 5xx cho lỗi hệ thống. Thông báo bảo trì cũng đang chỉ coi vai trò Admin là người xem toàn bộ (`app/api/maintenance/notifications/route.ts:20`).

## P2 — Các luồng nên cải thiện tiếp

### 8. Lịch tuần: bản đã ký/duyệt không gắn phiên bản nội dung

- Vị trí: `lib/services/weeklyScheduleService.ts:368`, `:241`; `app/api/weekly-schedule/route.ts:45`.
- upsertBatch sửa nội dung nhưng không kiểm tra/đánh dấu lại thông tin ký duyệt. Chữ ký/ảnh duyệt được lưu riêng và vẫn tồn tại sau khi nội dung đổi.
- Một PUT có thể lưu cells, ghi chú và chữ ký bằng các transaction/lệnh riêng; lỗi bước sau để lại một phần đã lưu. Không đối chiếu toàn bộ cell.weekStartDate với weekStart của request.
- Hướng sửa: phiên bản nội dung, ký duyệt gắn phiên bản; khi sửa phải yêu cầu duyệt lại hoặc giữ rõ phiên bản đã duyệt. Một transaction cho một lần lưu; kiểm tra mọi ô thuộc cùng tuần. Đây là yêu cầu nhất quán, cần thống nhất quy trình duyệt thực tế.

### 9. Kế hoạch công việc: thao tác xem có tác dụng triển khai

- Vị trí: `app/api/work-plans/route.ts:37`, `lib/services/workPlanService.ts:398`.
- GET một ngày trong quá khứ/hôm nay gọi implementDuePlans cho mọi kế hoạch đến hôm nay của nhân viên, không chỉ ngày đang xem. Truy cập staffId=0 có thể chạy trên toàn bộ nhân viên.
- Một lỗi ở giữa danh sách dừng xử lý và GET trả lỗi, trong khi các kế hoạch trước đã commit. Việc tự triển khai phụ thuộc truy cập trang/API.
- Hướng sửa: GET chỉ đọc; triển khai từ thao tác hoặc tác vụ rõ ràng, báo kết quả từng mục. Điểm tốt hiện có: implementWithClient đã khóa WorkPlanItem và kiểm IsImplemented để tránh triển khai trùng cùng bản ghi.

### 10. Kho: chống gửi lặp và lọc ngày kết thúc

- Vị trí: `lib/services/sparePartService.ts:201`, `:302`; schema `scripts/migrations/2026-05-14_create_inventory_tables.sql:28`.
- createTransaction đã khóa vật tư, kiểm số lượng nguyên dương và chặn xuất vượt tồn; đây là phần logic tốt, không cần viết lại cơ chế kiểm tồn.
- Chưa có định danh yêu cầu chống gửi lặp: retry một yêu cầu đã commit có thể ghi thêm giao dịch và cộng/trừ thêm tồn. Khóa tồn không giải quyết việc lặp lại cùng một nghiệp vụ.
- TransactionDate là timestamp theo migration; lọc <= endDate với đầu vào YYYY-MM-DD chỉ bao gồm 00:00 của ngày cuối, có thể bỏ giao dịch ban ngày. Hướng sửa: cửa sổ từ đầu startDate đến trước đầu ngày sau endDate.
- Xóa vật tư hiện xóa cứng (`:196`); migration đặt ON DELETE CASCADE cho lịch sử giao dịch. Cần chọn chặn xóa vật tư đã phát sinh hoặc lưu trữ/ẩn để giữ sổ kho. Chưa xác minh constraint thực tế của DB production trong lần rà soát này.

### 11. Reset mật khẩu: token dùng một lần chưa được tiêu thụ nguyên tử

- Vị trí: `app/api/auth/reset-password/route.ts:44` và `:78`.
- Đọc token, kiểm tra, hash, cập nhật mật khẩu và xóa token bằng các query riêng. Hai request đồng thời có thể cùng kiểm tra token thành công; lần ghi cuối quyết định mật khẩu. Lỗi xóa token sau khi đổi mật khẩu cũng tạo trạng thái không nhất quán.
- Hướng sửa: kiểm tra và tiêu thụ token dưới khóa/transaction, kết hợp thu hồi phiên. Chưa thực hiện reset thật để tái hiện.

## Ưu tiên triển khai đề xuất

1. Khép quyền sự kiện, kiểm tra khóa/thu hồi phiên, sửa 401/403 và vai trò SuperAdmin.
2. Đồng bộ đúng từng kỳ bảo trì; gộp workflow báo cáo/thiết bị/sự kiện; tránh ghi đè trạng thái và chạy lặp.
3. Gia cố backup/restore trước lần phục hồi tiếp theo.
4. Phiên bản ký duyệt lịch tuần, tách GET khỏi triển khai, chống gửi lặp và sửa bộ lọc kho.

Bổ sung test hành vi cho từng lỗi ở trên trước khi sửa. Các test `protected-routes.test.ts` chủ yếu kiểm tra có tên guard trong file; chúng không chứng minh từng HTTP method, từng vai trò và từng bản ghi đều được phân quyền đúng. 36 test đạt là bằng chứng cho các ca hiện có, không phủ các lỗi mới phát hiện.
