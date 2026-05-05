# Hướng dẫn Đồng bộ Database (Local -> Neon)

Tài liệu này hướng dẫn cách sao lưu dữ liệu từ môi trường phát triển (Local) và khôi phục lên server Production (Neon).

## 1. Quy trình thực hiện

### Bước 1: Sao lưu dữ liệu từ Local
Chạy lệnh này trong Terminal tại thư mục gốc của dự án. 
Lệnh này sẽ tạo ra một file `.sql` chứa toàn bộ cấu trúc và dữ liệu.

```powershell
pg_dump --clean --if-exists --no-owner --no-privileges "postgresql://postgres:lhkhiem1990@localhost:5432/hgmanager" > hgmanager_backup.sql
```
*Giải thích tham số:*
- `--clean --if-exists`: Tự động thêm lệnh xóa bảng cũ trước khi tạo mới (tránh lỗi trùng lặp dữ liệu).
- `--no-owner --no-privileges`: Loại bỏ quyền sở hữu của user local để tương thích với Neon.

### Bước 2: Khôi phục dữ liệu lên Neon
Đẩy dữ liệu từ file vừa tạo lên server Neon.

```powershell
psql "postgresql://neondb_owner:npg_GqcJydb1LuK5@ep-patient-smoke-a1ekhm8f-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -f hgmanager_backup.sql
```

## 2. Lưu ý quan trọng cho Vercel

Sau khi restore database, nếu ứng dụng trên Vercel gặp lỗi đăng nhập (Lỗi 500), hãy kiểm tra các mục sau trong **Vercel Settings > Environment Variables**:

1. **DATABASE_URL**: Đảm bảo sử dụng đường dẫn kết nối chính xác của Neon. Nên sử dụng link **Pooled** (có đuôi `-pooler`) để tối ưu hiệu năng.
   - Ví dụ: `postgresql://user:password@host-pooler.../neondb?sslmode=require`
2. **Loại bỏ channel_binding**: Nếu gặp lỗi kết nối, hãy xóa tham số `&channel_binding=require` trong chuỗi kết nối trên Vercel.
3. **JWT_SECRET**: Đảm bảo biến này đã được khai báo trên Vercel và khớp với logic xử lý token của ứng dụng.

## 3. Dọn dẹp
Sau khi hoàn tất, bạn nên xóa file backup để bảo mật thông tin:
```powershell
rm hgmanager_backup.sql
```
