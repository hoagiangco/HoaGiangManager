# Lịch bảo trì cố định theo ngày cài đặt

Quy tắc người dùng đã chốt: ngày hoàn thành không phải mốc tính chu kỳ. Thay đổi chỉ nằm trong mã dev; không chạy migration, sửa lịch hiện có hoặc chạy tác vụ trên database dùng chung.

## Quy tắc đã triển khai

- Mọi lần tính đều neo vào `StartFrom`. Nếu dữ liệu cũ không có ngày neo, bộ tính dùng ngày đến hạn đang lưu làm mốc dự phòng; không tự sửa hàng loạt dữ liệu cũ.
- Chu kỳ ngày/tuần tính theo số ngày lịch. Chu kỳ tháng/năm tính trực tiếp từ ngày neo gốc, không cộng nối qua một tháng đã bị rút ngắn.
- Ngày không tồn tại trong tháng dùng ngày cuối tháng; tháng sau trở lại ngày neo. `31/01 → 28/02 → 31/03`; năm nhuận cũng giữ được ngày 29/02 khi quay lại năm nhuận.
- Lịch nhiều thứ giữ các tuần hoạt động tính từ tuần chứa StartFrom; tuần bắt đầu Chủ nhật như quy ước cũ. Lịch năm giữ tháng của StartFrom. Các ngày bị trùng sau khi chặn cuối tháng chỉ tạo một lần trong ngày đó.
- Lần đầu bao gồm ngày bắt đầu nếu ngày đó hợp lệ. Sửa cấu hình lấy kỳ hợp lệ từ hôm nay trở đi, không được trước StartFrom. Chỉ sửa nội dung giữ nguyên ngày đến hạn hiện có.
- Khi hoàn thành, server lấy kỳ tiếp theo trên lịch cố định sau hôm nay nếu hạn hiện tại đã đến/quá hạn. Ngày hoàn thành được nhập sớm, muộn hay hồi tố không làm thay đổi phép tính. Nếu hạn đang ở tương lai (hoàn thành sớm, đã được cron cập nhật hoặc đã dời lịch), giữ nguyên hạn đó.
- Dời lịch thay đổi riêng hạn hiện tại, không thay StartFrom. Khi đến ngày được dời, kỳ sau quay về lịch neo gốc. Ngày được dời phải nằm trong khoảng StartFrom–EndAt.
- EndAt bao gồm cả ngày kết thúc. Không sinh kỳ tiếp theo sau ngày đó. Khôi phục kế hoạch đã hết hạn cần sửa EndAt trước.
- Ngày kế hoạch được đọc/ghi như ngày lịch; phép tính không phụ thuộc múi giờ server. Quá hạn/sắp đến dùng hiệu ngày Việt Nam, không làm tròn chênh lệch giờ.

Ví dụ: StartFrom=10/09, chu kỳ tháng, thao tác vào 13/09 thì kỳ tiếp theo là 10/10 dù nhập ngày hoàn thành là 08/09, 10/09 hay 13/09. Nếu hoàn thành sớm vào 08/09, hạn 10/09 vẫn được giữ đến khi lịch chạy qua kỳ đó.

## Các luồng được đổi

- `lib/utils/maintenanceScheduler.ts`: bộ tính ngày có neo và các hàm ngày Việt Nam.
- `lib/services/maintenanceScheduleService.ts`: khóa bản ghi khi cập nhật, giữ lịch tương lai, không dùng ngày hoàn thành.
- `EventService`: ghi sự kiện hoàn thành và cập nhật lịch trong cùng giao dịch; rollback nếu lưu lịch thất bại. Giữ thông tin kỳ trong metadata khi sửa sự kiện. Sửa sự kiện đã hoàn thành không đẩy tiếp lịch.
- Màn hình Bảo trì: bỏ cập nhật lịch từ trình duyệt và bỏ cập nhật giả trong state; tải lại lịch đã được server lưu. Gửi định danh kế hoạch/kỳ khi tạo sự kiện.
- Đồng bộ Báo cáo: dùng cùng dịch vụ tính lịch cố định.
- API tạo/sửa kế hoạch: tính lịch có neo, kiểm tra khoảng ngày. API sửa tổng quát yêu cầu quyền quản lý và không nhận lịch mới tính từ hoàn thành của client.
- Tác vụ nhắc lịch: lấy cả hạn bị bỏ lỡ, khóa và đọc lại từng kế hoạch, tạo sự kiện planned theo từng kỳ, không kế thừa trạng thái/ngày hoàn thành từ báo cáo cũ. Mỗi lần xử lý tối đa 366 kỳ bị bỏ lỡ trên một kế hoạch; phần còn lại tiếp tục lần chạy sau. Không sửa sequence trong tác vụ này.

## Kiểm thử và giới hạn

Các test mới trong `tests/maintenance-scheduler.test.ts`, `tests/maintenance-persistence.test.ts` và `tests/maintenance-timezone.test.ts` kiểm tra cuối tháng, năm nhuận, nhiều thứ, tuần cách quãng, giới hạn StartFrom/EndAt, dời lịch, hoàn thành sớm/muộn, cập nhật lại, transaction rollback, tác vụ xử lý kỳ bị bỏ lỡ và ba múi giờ Việt Nam/UTC/Mỹ.

Test service/tác vụ dùng database giả lập trong bộ nhớ, không kết nối database thật và không gửi thông báo. Việc chạy tác vụ production, kiểm thử UI và chỉnh lại các ngày đã bị tính sai từ trước chưa được thực hiện. Không xem bản sửa này là đã giải quyết toàn bộ các vấn đề lịch sử báo cáo/xuất file nêu trong báo cáo rà soát.
