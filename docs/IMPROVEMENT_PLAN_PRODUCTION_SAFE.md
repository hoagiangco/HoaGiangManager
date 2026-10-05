# Kế hoạch cải thiện logic, bảo vệ production đang chạy

Ngày lập: 11/09/2026. Căn cứ: `BUSINESS_LOGIC_REVIEW_2026-09-11.md`.

## Phạm vi đã thống nhất

- Người dùng yêu cầu lập kế hoạch giải quyết từng phần và không ảnh hưởng production đang chạy.
- Dev và production hiện dùng chung database; không đặt việc tách database vận hành thành điều kiện của kế hoạch.
- Quy tắc bảo trì giữ nguyên: chu kỳ neo ngày cài đặt, bất kể ngày hoàn thành.
- Lần này chỉ lập kế hoạch. Chưa sửa thêm mã vận hành, tạo worktree, chạy build, migration, triển khai hoặc thao tác dữ liệu thật.

## Nguyên tắc thực hiện

1. Làm việc trong checkout/thư mục riêng, không sửa nơi production đang chạy. Xác định chính xác nguồn mã/build của production trước khi bắt đầu; không mặc định mã workspace hiện tại giống bản production.
2. Không build trong thư mục production: hiện Next.js dùng `.next`; PWA sinh file trong `public`; package script ghi đè `deploy.zip`. Cả source, `.next`, `public`, gói phát hành và cấu hình thử nghiệm phải riêng. Khác cổng không đủ nếu dùng chung file.
3. Không sao chép `.env.local`, mật khẩu DB, khóa email/push/Blob, uploads và backup thật vào môi trường test. Kiểm tra việc dotenv tự tải cấu hình và các service tự tạo schema trước khi import/chạy. Thiết lập môi trường test chặn kết nối ra DB/dịch vụ thật, không chỉ dựa vào quy ước của người chạy.
4. Test logic bằng dữ liệu tổng hợp, API/service giả lập; email/push/Blob/backup/cron đều là giả lập. Không đăng nhập tài khoản production để test vì login cũng cập nhật số lần đăng nhập sai/khóa tài khoản. Không dùng GET bất kỳ làm kiểm tra an toàn khi GET kế hoạch hiện còn có tác dụng ghi.
5. Kiểm thử khóa/giao dịch thật chỉ dùng môi trường dùng một lần, không kết nối database chung, nếu có điều kiện thiết lập. Nếu chưa có, báo rõ giới hạn của test giả lập; không thay thế bằng thử ghi trên production.
6. Mỗi phần có thay đổi nhỏ, test hồi quy, bản mô tả, gói riêng và phương án quay lại. Không gom toàn bộ thành một lần phát hành.
7. SQL nếu cần chỉ được soạn và kiểm tra trước. Không tự chạy trên DB chung. Không chạy migration tổng, seed, restore, cron, sửa ngày cũ hoặc dọn dữ liệu.
8. Sau khi gói thay đổi cụ thể đã qua kiểm tra, mới trình duyệt việc triển khai production. Việc phê duyệt kế hoạch không được coi là phê duyệt restart, ghi DB hoặc phát hành ngay.

## Phần 0 — Cố định bản gốc và ranh giới môi trường

**Việc làm:** xác định thư mục release đang chạy, tiến trình/cổng, cách khởi động, vị trí uploads và service worker, lịch tác vụ, cách đưa bản mới lên. Ghi mã/build ID production nếu có. Lưu riêng snapshot mã dev đang sửa, gồm cả file chưa được git theo dõi, không gồm bí mật/dữ liệu thật. Chuẩn bị checkout riêng từ đúng snapshot cần phát triển.

**Điều kiện hoàn thành:** có sơ đồ ngắn “production đọc file nào / dev được phép ghi đâu”; xác nhận mọi đầu ra test/build/package nằm ngoài đường dẫn production. Test có thể chạy khi không có thông tin kết nối DB thật. Giữ được bản release cũ nguyên vẹn.

**Production:** chỉ đọc thông tin cần thiết. Không restart, không đổi env, không ghi đè file release.

## Phần 1 — Phân quyền API, khóa tài khoản và mã lỗi

**Giải quyết:** mục 1, phần khóa tài khoản của mục 2, mục 7 trong báo cáo rà soát.

**Việc làm:**

- Tách quyền quản lý sự kiện khỏi thực hiện bảo trì. Xác minh sự kiện/kế hoạch từ DB và giới hạn các trường người thực hiện được sửa; không dùng chuỗi metadata để cấp quyền.
- Kiểm trạng thái khóa ở middleware trên mỗi request.
- Thống nhất quyền Admin/SuperAdmin cho sao lưu và thông báo; 401 cho xác thực thất bại, 403 cho thiếu quyền, 5xx cho lỗi hạ tầng.
- Client chỉ hủy phiên khi xác thực thực sự không hợp lệ; giữ nhánh bắt buộc đổi mật khẩu.

**Test bắt buộc:** User không sửa sự kiện không được phép dù thay metadata; người được phân công vẫn thực hiện được bảo trì; SuperAdmin xem sao lưu không bị logout; khóa một tài khoản chặn token tài khoản đó; lỗi DB không xóa phiên hợp lệ.

**Dữ liệu/schema:** ưu tiên dùng cột hiện có, không cần migration cho phần này. Không đổi JWT_SECRET hoặc buộc mọi người đăng nhập lại.

**Quay lại:** trả mã về release trước, nhưng phải ghi nhận lỗ hổng phân quyền được mở lại khi rollback; ưu tiên vá tiến nếu khả thi.

## Phần 2 — Thu hồi phiên khi đổi mật khẩu và reset token một lần

**Giải quyết:** phần thu hồi phiên của mục 2 và mục 11.

**Việc làm:** token reset được kiểm tra/tiêu thụ cùng transaction với đổi mật khẩu. Thiết kế phiên bản phiên để thu hồi đúng tài khoản khi đổi/reset mật khẩu.

**Phương án tương thích dự kiến:** thêm cột phiên bản phiên có giá trị mặc định 0; token cũ chưa có phiên bản được hiểu là 0, token mới chứa phiên bản. Chỉ tăng phiên bản khi cần thu hồi tài khoản đó. Không thay bí mật ký JWT toàn hệ thống. Kiểm tra schema thực tế trước khi chốt SQL.

**Test bắt buộc:** hai request reset đồng thời chỉ một request thành công; lỗi DB rollback cả mật khẩu và token; phiên người không liên quan vẫn dùng được; token cũ của tài khoản vừa reset bị từ chối; kiểm thử giai đoạn chuyển tiếp.

**Dữ liệu/schema:** có thể cần migration bổ sung. Soạn riêng, đánh giá khóa bảng/chi phí trên quy mô DB thật, chuẩn bị mã tương thích trước và chỉ chạy sau phê duyệt. Không xóa/đổi nghĩa cột cũ trong cùng release.

**Quay lại:** giữ cột bổ sung khi rollback mã, không xóa dữ liệu phiên bản. Mã cũ không kiểm phiên bản có thể bỏ qua việc thu hồi, vì vậy không coi rollback mã là khôi phục đầy đủ bảo vệ phiên.

## Phần 3 — Sao lưu/phục hồi

**Giải quyết:** mục 6. Hoàn tất trước khi dùng chức năng phục hồi cho một đợt phát hành.

**Việc làm:** chọn backup qua ID do server quản lý; ràng buộc đường dẫn vào thư mục backup và nguồn tải được cho phép; thay chuỗi shell bằng chương trình + mảng tham số; xác định nơi lưu riêng tư; phân biệt bản sao chỉ dữ liệu và bản phục hồi đầy đủ. Nhánh fallback cần snapshot nhất quán, schema/sequence phù hợp và thứ tự dữ liệu đúng; không im lặng tiếp tục restore sau khi bước bảo vệ thất bại.

**Test bắt buộc:** đường dẫn vượt thư mục và nguồn tải ngoài danh sách bị từ chối; lỗi bước bất kỳ không báo thành công; bộ dữ liệu có khóa ngoại/sequence phục hồi được trong môi trường dùng một lần. Chưa chứng minh được phục hồi thì chưa ghi nhận chức năng này đạt.

**Production:** không thực hiện restore thử. Không tự di chuyển/xóa bản backup cũ hoặc đổi quyền Blob đang dùng; các thao tác đó có kế hoạch riêng khi chuẩn bị triển khai.

**Quay lại:** giữ nguyên các bản sao cũ; chọn lại release trước. Nếu đã có thao tác phục hồi thật, cần phương án xử lý dữ liệu riêng, không chỉ đổi mã.

## Phần 4 — Báo cáo, từng kỳ bảo trì và trạng thái thiết bị

**Giải quyết:** mục 3, 4, 5. Đây là phần nghiệp vụ lớn nhất; chia thành ba thay đổi nhỏ.

**4A — Liên kết đúng kỳ:** dùng kế hoạch + hạn gốc/kỳ + thiết bị; không cập nhật mọi sự kiện chưa liên kết trong cùng batch. Dữ liệu cũ không xác định được kỳ phải được báo là cần đối chiếu, không tự đoán và ghi lại. Nếu cần thêm khóa/cột/chỉ mục, tách SQL riêng và không áp dụng trên DB chung trong giai đoạn phát triển.

**4B — Một luồng chuyển trạng thái:** gom báo cáo, lịch sử, sự kiện và lịch liên quan vào service điều phối; bỏ gọi đồng bộ hai lần; khóa bản ghi cần thiết và xử lý yêu cầu lặp. Thông báo chỉ phát sau commit, không phát từ các bước có thể rollback. Ngày hoàn thành giữ vai trò ngày thực hiện; không đổi mốc chu kỳ.

**4C — Trạng thái thiết bị:** chốt quy tắc ưu tiên trạng thái do quản trị chọn và tình trạng do báo cáo suy ra. Không tự chuyển Hư hỏng/Đã thanh lý về Đang sử dụng chỉ vì không còn báo cáo mở.

**Test bắt buộc:** hai kỳ cùng nhóm không ảnh hưởng nhau; xử lý nhiều kỳ bị bỏ lỡ; sự kiện cũ đã hoàn thành không bị đổi theo báo cáo mới; hoàn thành sớm/muộn/hồi tố vẫn bám lịch cài đặt; hai người xử lý đồng thời; lỗi giữa các bước rollback; gửi lại không thêm lịch sử/thông báo; trạng thái thiết bị được chọn không bị ghi đè sai.

**Quay lại:** release mới phải duy trì khả năng đọc dữ liệu cũ và dữ liệu bổ sung; không sửa/xóa lịch sử hàng loạt. Tách việc đối soát và sửa dữ liệu cũ khỏi bản sửa code. Nếu thay đổi cấu trúc bản ghi làm mã cũ không đọc được thì chưa đủ điều kiện phát hành theo kế hoạch này.

## Phần 5 — Kho

**Giải quyết:** mục 10.

**Việc làm:** giữ cơ chế khóa tồn/chặn tồn âm; thêm định danh giao dịch để retry không nhập/xuất hai lần; sửa khoảng ngày kết thúc thành trước đầu ngày kế tiếp; chặn xóa vật tư có giao dịch hoặc chuyển sang lưu trữ/ẩn.

**Test bắt buộc:** hai lần gửi cùng một yêu cầu chỉ ghi một giao dịch; hai giao dịch thật khác nhau vẫn ghi đủ; hai người xuất đồng thời không gây tồn âm; lấy đủ giao dịch cuối ngày; không mất lịch sử khi xóa vật tư.

**Dữ liệu/schema:** tách sửa lọc ngày/chặn xóa khỏi phần cần khóa duy nhất cho định danh giao dịch. Kiểm tra dữ liệu trùng trước khi thiết kế index; không tự hợp nhất giao dịch đã có.

**Quay lại:** không đảo ngược giao dịch thật để rollback mã; giữ sổ giao dịch và có quy trình điều chỉnh riêng nếu phát hiện sai lệch.

## Phần 6 — Lịch tuần và ký duyệt

**Giải quyết:** mục 8.

**Việc làm:** một transaction cho lần lưu cả nội dung, ghi chú và thông tin duyệt; kiểm mọi ô thuộc đúng tuần; gắn ký duyệt với phiên bản nội dung, phát hiện chỉnh sửa đồng thời. Quy tắc đề xuất: sửa nội dung sau ký làm bản mới cần duyệt lại, vẫn giữ bản đã ký để tra cứu.

**Test bắt buộc:** lỗi lưu chữ ký không để nội dung lưu dở; không lưu ô sang tuần khác; sửa bản đã ký không hiển thị như chữ ký đang duyệt nội dung mới; phát hiện hai người sửa cùng phiên bản.

**Dữ liệu/schema:** có thể cần phiên bản và lịch sử bản duyệt; chỉ bổ sung, không xóa chữ ký cũ. Cần thống nhất quy trình duyệt trước khi triển khai.

**Quay lại:** giữ được bản đã ký và nội dung gốc; đánh giá tương thích release cũ với dữ liệu phiên bản trước khi phát hành.

## Phần 7 — Kế hoạch công việc

**Giải quyết:** mục 9.

**Việc làm:** GET chỉ đọc. Chuyển tự triển khai sang thao tác/tác vụ riêng; có kết quả từng mục, xử lý tiếp mục độc lập khi một mục lỗi. Giữ khóa và kiểm IsImplemented hiện có.

**Test bắt buộc:** mở trang/lọc/xem ngày cũ không tạo báo cáo; triển khai hai lần không trùng; một mục lỗi không báo cả danh sách thành công; quyền/nhân viên được kiểm tra lại trong transaction.

**Chuyển tiếp production:** chuẩn bị đường triển khai mới trước khi bỏ tác dụng ghi của GET, tránh ngừng tự triển khai ngoài ý muốn. Nếu dùng cron, xác minh chỉ một cơ chế phụ trách và không kích hoạt trong lúc thử dev.

**Quay lại:** tắt tác vụ mới trước khi phục hồi mã GET cũ; không để hai cơ chế triển khai cùng chạy mà chưa được kiểm thử.

## Điều kiện cho mỗi lần phát hành

1. Có diff/commit hoặc snapshot xác định, phạm vi rõ, test mới tái hiện lỗi trước sửa và đạt sau sửa; chạy test hồi quy, typecheck, lint/build trong thư mục riêng.
2. Có bằng chứng test UI trên môi trường không ghi production khi phần sửa tác động giao diện. Nếu test DB thật/giao diện chưa thực hiện phải ghi rõ, không dùng kết quả test giả lập để tuyên bố đã kiểm toàn bộ.
3. Gói phát hành mang phiên bản riêng, manifest/hash và không chứa `.env`/bí mật/dữ liệu thật; không ghi đè gói đang dùng. Giữ tài nguyên tĩnh cần cho phiên trình duyệt đang mở; kiểm tra service worker/PWA để tránh mã client và server khác phiên bản.
4. Nếu có SQL: nêu tác động khóa bảng, tính tương thích, thời điểm áp dụng và cách xử lý lỗi. Không dùng hạ schema/xóa cột như bước rollback mặc định.
5. Trình người dùng gói cụ thể, kết quả kiểm tra, bước triển khai và phương án quay lại. Chỉ triển khai sau phê duyệt riêng; không mặc định cần dừng production nếu chưa biết mô hình chạy.
6. Khi được phép triển khai: dùng release riêng và cơ chế chuyển phiên bản phù hợp hạ tầng thực tế, kiểm tra sức khỏe trước/sau, theo dõi 401/403/5xx và lỗi nghiệp vụ. Phương án thời gian gián đoạn được xác định ở phần 0; không hứa không gián đoạn khi chưa kiểm chứng.

## Thứ tự đề xuất

0 → 1 → 2 → 3 → 4A → 4B → 4C → 5 → 6 → 7.

Mỗi phần là một mốc bàn giao riêng; phần có migration được tách khỏi thay đổi code không cần migration. Có thể hoàn tất nhiều phần trên dev trước, nhưng không đồng nghĩa gom chúng thành một gói triển khai production. Điểm bắt đầu sau khi quyết định thực hiện là phần 0 và phần 1, chưa phải cập nhật production.
