# Hướng dẫn Backup và Restore Database

Dưới đây là quy trình để sao lưu dữ liệu từ máy local và khôi phục lên server Neon.

### 1. Backup dữ liệu từ Local
Chạy lệnh này tại terminal để xuất file dữ liệu.
- `--clean --if-exists`: Thêm lệnh xóa các bảng cũ nếu đã tồn tại để khi restore không bị lỗi trùng lặp.
- `--no-owner --no-privileges`: Loại bỏ thông tin về user local để tránh lỗi phân quyền trên Neon.

```powershell
pg_dump --clean --if-exists --no-owner --no-privileges "postgresql://postgres:lhkhiem1990@localhost:5432/hgmanager" > hgmanager_backup.sql
```

### 2. Restore dữ liệu lên Neon
Chạy lệnh này để đẩy file dữ liệu vừa tạo lên server Neon.

```powershell
psql "postgresql://neondb_owner:npg_GqcJydb1LuK5@ep-patient-smoke-a1ekhm8f-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" -f hgmanager_backup.sql
```

---
**Lưu ý:**
- Đảm bảo bạn đã cài đặt PostgreSQL và các lệnh `pg_dump`, `psql` có thể chạy được trong terminal.
- File `hgmanager_backup.sql` sẽ được tạo ra tại thư mục bạn đang đứng.
