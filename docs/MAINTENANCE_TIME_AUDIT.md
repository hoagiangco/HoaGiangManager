# Rà soát thời gian bảo trì — 10/09/2026

> Đây là kết quả rà soát trước khi sửa. Người dùng sau đó đã chốt: chu kỳ luôn neo ngày cài đặt, bất kể ngày hoàn thành. Thay đổi dev và phạm vi kiểm thử hiện tại được ghi trong `MAINTENANCE_CALENDAR_RULES.md`; các kết quả lỗi bên dưới được giữ làm lịch sử tái hiện.

## Phạm vi và kết luận

Rà soát mã tạo/sửa kế hoạch, dời/hủy/khôi phục, bắt đầu/hoàn thành, đồng bộ báo cáo, tác vụ nhắc lịch, thông báo và lịch sử/xuất file. Chạy trực tiếp hàm tính lịch hiện tại bằng script `node scripts/audit-maintenance-time.cjs` trong ba múi giờ Asia/Ho_Chi_Minh, UTC và America/Los_Angeles, với thời điểm hiện tại cố định. Script chỉ ghi nhận kết quả, không phải bộ test khẳng định nghiệp vụ đã đạt.

Chỉ truy vấn đọc schema và thống kê database; không chạy tác vụ nhắc lịch, không tạo sự kiện, không gửi thông báo, không sửa dữ liệu hoặc mã vận hành. Chưa xác minh giao diện và lịch chạy tác vụ trên máy production.

Kết luận: các luồng chưa thống nhất về mốc tính lịch. Có lỗi tái hiện được về cuối tháng, giới hạn ngày bắt đầu và múi giờ. Chưa đủ điều kiện khẳng định thời gian bảo trì chính xác trong mọi chức năng.

## Mô hình nghiệp vụ đề xuất (chưa áp dụng)

- Ngày lịch: `YYYY-MM-DD` theo Việt Nam, không mang giờ. Ngày đến hạn, ngày bắt đầu/kết thúc kế hoạch, ngày thực hiện đều thuộc loại này.
- Thời điểm ghi nhận: một thời điểm thực có múi giờ/UTC, dùng cho nhật ký ai sửa lúc nào. Không chuyển một Date thành “giờ Việt Nam giả” rồi tiếp tục coi đó là một thời điểm thực.
- Mỗi kỳ có định danh riêng: kế hoạch + ngày hạn gốc. Lưu riêng hạn gốc, ngày được dời, ngày bắt đầu thực tế và ngày hoàn thành thực tế.
- `NextDueDate` cần được định nghĩa rõ là kỳ chưa sinh hay kỳ chưa thực hiện. Hiện cron dùng nghĩa thứ nhất, giao diện lại dùng như nghĩa thứ hai. Chỉ sửa phép cộng ngày sẽ chưa giải quyết hết vấn đề.
- Lịch ngày/thứ cố định luôn bám cấu hình. Với chu kỳ thường, đề xuất neo vào ngày bắt đầu; người dùng đang được hỏi lựa chọn neo lịch gốc hay tính từ hoàn thành. Chưa xem đề xuất này là quyết định được duyệt.
- Đề xuất cuối tháng: thiếu ngày thì dùng ngày cuối tháng, nhưng giữ ngày neo gốc cho tháng sau. Ví dụ 31/01 → 28/02 → 31/03; 29/02/2024 → 28/02/2025 và trở lại 29/02 khi gặp năm nhuận. Đây là chính sách đề xuất; không dùng ngày tràn sang tháng sau.
- Đề xuất hạn kết thúc bao gồm cả ngày `EndAt`. Không tạo kỳ mới sau ngày đó; vẫn cho hoàn thành kỳ đã phát sinh trước đó.

## Theo từng chức năng

| Chức năng | Hiện tại | Quy tắc cần thống nhất / sửa |
|---|---|---|
| Tạo chu kỳ ngày/tuần/tháng/năm | API bulk lấy StartFrom làm hạn đầu; ngày quá khứ vẫn được giữ | Quy định cho phép kỳ quá hạn hay chỉ sinh kỳ hiện tại; không âm thầm bỏ công việc cũ |
| Tạo lịch ngày/thứ cố định | Hàm lấy tối thiểu là hôm nay khi tính lần đầu, khác với chu kỳ thường | Dùng cùng chính sách xử lý StartFrom quá khứ; giữ tuần/tháng/năm neo |
| Sửa chu kỳ / StartFrom | Chu kỳ thường neo StartFrom; nhánh specific_dates bỏ qua StartFrom khi tính lại | Không được sinh hạn trước StartFrom; đổi lịch chỉ tác động các kỳ tương lai theo quy tắc rõ ràng |
| Sửa mô tả/nhân viên/chi phí | Thường giữ hạn cũ; thay EndAt riêng cũng giữ hạn cũ | Nội dung không làm đổi hạn; thay EndAt phải kiểm tra hạn còn hợp lệ |
| Dời lịch một thiết bị / cả nhóm | Chỉ đổi NextDueDate và ghi lịch sử; không đổi StartFrom; không chặn ngày ngoài khoảng kế hoạch | Đề xuất chỉ dời kỳ hiện tại, giữ neo các kỳ sau; báo rõ khi dời qua kỳ kế tiếp hoặc ngoài EndAt |
| Bắt đầu bảo trì | Đơn lẻ dùng hôm nay; hàng loạt nhận ngày nhập; ngày kỳ và ngày thực hiện chưa được tách rõ | Lưu ngày bắt đầu thực tế, giữ hạn của kỳ; API kiểm tra ngày hợp lệ |
| Hoàn thành đơn lẻ / hàng loạt | Cộng chu kỳ từ ngày hoàn thành, bỏ qua specific_dates và neo StartFrom; không kiểm EndAt | Một bộ tính lịch dùng chung; hoàn thành phải >= bắt đầu; không đẩy lịch hai lần khi gửi lại |
| Hoàn thành qua Báo cáo | Tính từ hôm nay với StartFrom; bỏ qua nếu NextDueDate đang ở tương lai | Phải xử lý theo kỳ của báo cáo, không suy đoán chỉ từ “NextDueDate > hôm nay”; ngày nhập hồi tố cần được giữ |
| Hủy | IsActive=false, giữ hạn cũ | Dừng sinh kỳ tương lai, giữ lịch sử; phân biệt hủy kế hoạch với hủy một kỳ |
| Khôi phục | IsActive=true, giữ nguyên hạn cũ và EndAt | Nếu hạn đã qua hoặc kế hoạch đã hết hạn phải xử lý rõ: giữ kỳ quá hạn / chọn lịch mới; không chỉ bật cờ |
| Thêm thiết bị vào nhóm | Sao chép hạn sớm nhất trong nhóm; không có hạn hoạt động thì dùng hiện tại | Thiết bị mới tham gia kỳ nào phải rõ; không vô tình kéo về quá khứ hoặc vượt EndAt |
| Tác vụ nhắc lịch | Chỉ chọn hạn trong hôm nay, rồi đẩy NextDueDate dù sự kiện chưa hoàn thành | Có cơ chế xử lý kỳ bị bỏ lỡ, định danh kỳ chống trùng; không coi báo cáo hoàn thành cũ là hoàn thành kỳ mới |
| Quá hạn / sắp đến / số ngày còn lại | Trộn đầu ngày cục bộ, Date có giờ, ceil theo mili giây, mốc 30 ngày | Hiệu hai ngày lịch Việt Nam: âm=quá hạn, 0=hôm nay, dương=còn ngày; cửa sổ bao gồm trọn ngày cuối |
| Lần bảo trì trước / lịch sử / xuất file | Một số nơi ưu tiên EventDate/CreatedAt hơn EndDate; nhiều nơi cắt ngày ISO UTC | “Đã thực hiện” dùng ngày hoàn thành thực tế; “kỳ bảo trì” dùng hạn kỳ; danh sách, chi tiết và file xuất cùng quy tắc |

## Kết quả chạy tái hiện

Ngày dưới đây là ngày lịch. Các trường hợp ngày/tháng dùng thời gian hiện tại cố định 10/09/2026 khi cần.

| Trường hợp | Kết quả hiện tại | Nhận định |
|---|---|---|
| 10/09 + 3 ngày | 13/09 | Đúng với chu kỳ ngày đơn giản |
| 10/09 + 2 tuần | 24/09 | Đúng với chu kỳ tuần đơn giản |
| 31/01/2026 + 1 tháng | 03/03/2026 | Tràn tháng; theo chính sách chặn cuối tháng đề xuất phải là 28/02 |
| 31/03/2026 + 1 tháng | 01/05/2026 | Tràn tháng; theo chính sách đề xuất phải là 30/04 |
| 29/02/2024 + 1 năm | 01/03/2025 | Không giữ tháng neo theo chính sách đề xuất |
| Lịch thứ Hai/thứ Năm sau thứ Hai 07/09 | Hàm chung: 10/09; luồng hoàn thành cộng tuần: 14/09 | Hai luồng không thống nhất; luồng hoàn thành bỏ ngày thứ Năm |
| Lịch ngày 31, đang ở 28/02/2026 | 28/02/2026 | Lỗi chắc chắn: “ngày tiếp theo” bằng ngày cũ |
| Lịch ngày 30 và 31, đang ở 28/02/2026 | 28/02/2026 | Cùng lỗi không tiến; cần loại trùng sau khi chặn cuối tháng |
| Lịch ngày 31, đang ở 29/02/2028 | 29/02/2028 | Lặp lại ngày cũ cả năm nhuận |
| Sửa lịch thứ Hai/thứ Năm, StartFrom=01/11, tính ngày 10/09 | 14/09 | Bỏ qua StartFrom ở nhánh ngày cố định |
| Lịch mỗi 2 tuần thứ Hai/thứ Năm, neo 07/09, tính ngày 14/09 | 17/09 | Bỏ neo tuần; theo lịch tuần neo, kỳ hoạt động kế tiếp là 21/09 |
| Lịch năm ngày 15, neo tháng 1, tính ngày 10/09 | 15/09 | Nhánh năm bỏ tháng neo; giao diện cũng chưa có cấu hình tháng riêng |
| Chu kỳ tháng neo 10/09, hoàn thành 13/09 | Hàm neo: 10/10; màn hình hoàn thành: 13/10 | Cần thống nhất mốc nghiệp vụ; hiện hai kết quả khác nhau |
| Hạn 07:00 hôm nay so với đầu hôm nay trong API upcoming | daysUntilDue=1 | Cùng ngày lịch nhưng báo còn 1 ngày |
| 00:00 ngày 10/09 Việt Nam → ISO → lấy phần ngày | 09/09 | UTC làm lùi ngày; không áp dụng cách này cho ngày lịch |
| HTML date 10/09 → new Date → setHours(0) tại Los Angeles | 09/09 | Phụ thuộc múi giờ máy người dùng |

## Các tương tác quan trọng

1. **Cron và hoàn thành có thể cùng sửa một hạn.** Cron sinh sự kiện rồi đẩy lịch. Màn hình hoàn thành lại tính lịch từ ngày hoàn thành; báo cáo thì bỏ qua nếu lịch đã ở tương lai. Thiếu định danh kỳ khiến việc chống đẩy hai lần chỉ là phỏng đoán.
2. **Cron bỏ kỳ quá hạn.** Điều kiện `NextDueDate >= today AND NextDueDate < tomorrow` không lấy kế hoạch hôm qua nếu tác vụ không chạy. Bật lại kế hoạch với hạn quá khứ cũng gặp tình huống này. Chưa kiểm tra cron production có đang được cấu hình/chạy hay không.
3. **Cron lấy báo cáo mới nhất theo cả nhóm, không theo kỳ.** Có thể kế thừa ngày/trạng thái hoàn thành từ báo cáo cũ. Truy vấn chống trùng cũng có điều kiện `EventDate = due OR Status = completed`, không giới hạn mọi nhánh về đúng kỳ.
4. **Chuỗi JSON trong truy vấn cron không chắc khớp JSONB.** Metadata trong DB là jsonb nhưng mẫu LIKE ghép không có khoảng trắng; cần so sánh khóa JSON trực tiếp. Vì vậy không kết luận rằng nhánh chống trùng hiện tại luôn chạy đúng như ý định.
5. **Ngày hoàn thành qua báo cáo có thể bị thay bằng hôm nay.** Đồng bộ sự kiện dùng CURRENT_TIMESTAMP/now cho ngày kết thúc ở các nhánh, trong khi báo cáo có thể nhập ngày thực hiện trước đó. Cần truyền ngày nghiệp vụ vào đồng bộ, không chỉ trạng thái.
6. **Hoàn thành có thể lưu dở dang.** API sự kiện và API lịch là hai yêu cầu riêng; lỗi lưu lịch bị catch rồi giao diện vẫn báo thành công. Lịch hiển thị tại chỗ còn có thể được đẩy dù lưu thất bại. Nên một giao dịch cho sự kiện, lịch và liên kết báo cáo.
7. **Không chỉ đổi timezone PostgreSQL là đủ.** Schema thực tế dùng TIMESTAMP WITHOUT TIME ZONE cho StartFrom/EndAt/NextDueDate/EventDate nhưng DATE cho Event.StartDate/EndDate. Bộ parse DATE trả chuỗi, còn TIMESTAMP thành Date theo môi trường. Cần thống nhất hợp đồng truyền ngày trước khi chuyển đổi kiểu lưu.

## Kiểm tra database ở chế độ chỉ đọc

- Chưa thấy kế hoạch hoạt động có NextDueDate vượt EndAt trong truy vấn kiểm tra.
- Có 1 bản ghi NextDueDate nhỏ hơn StartFrom khi so cả giờ, nhưng **0 bản ghi** khi so ngày lịch. Đây là dấu hiệu giờ lưu chưa nhất quán, chưa phải bằng chứng lịch đến hạn trước ngày bắt đầu.
- Không tự sửa các bản ghi hiện có từ những thống kê này.

## Thứ tự triển khai đề xuất

1. Chốt mốc chu kỳ thường và chính sách cuối tháng, hồi tố, dời một kỳ, khôi phục.
2. Một bộ xử lý ngày lịch Việt Nam và một bộ sinh kỳ có neo ngày/tuần/tháng/năm; xác thực dữ liệu tại server.
3. Dùng chung ở tạo/sửa/cron/hoàn thành/báo cáo. Tách sinh kỳ khỏi thực hiện kỳ; ghi nhận hoàn thành theo giao dịch và định danh kỳ.
4. Đồng nhất quá hạn, nhắc hạn, lịch sử, chi tiết và xuất file.
5. Viết test hồi quy theo bảng ca trên cùng các ca hoàn thành sớm/muộn, nhập hồi tố, gửi lại, tác vụ nghỉ nhiều ngày, qua EndAt và xử lý đồng thời; sau đó kiểm thử giao diện bằng dữ liệu riêng.
