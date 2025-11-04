# Hướng dẫn Setup và Chạy Dự án

## Bước 1: Tạo file .env

Tạo file `.env` trong thư mục gốc của dự án với nội dung sau:

```
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/hoagiang_manager

# JWT
JWT_SECRET=your-secret-key-change-this-min-32-characters
JWT_EXPIRES_IN=24h

# Server
PORT=3000
NODE_ENV=development

# File Upload
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=5242880
```

**Lưu ý:**
- Thay `username`, `password`, `localhost`, `5432`, `hoagiang_manager` bằng thông tin PostgreSQL của bạn
- Thay `JWT_SECRET` bằng một chuỗi bí mật ngẫu nhiên (ít nhất 32 ký tự)

## Bước 2: Chạy Database Migrations

```bash
npm run db:migrate
```

Lệnh này sẽ tạo tất cả các bảng trong database.

## Bước 3: Seed dữ liệu mặc định

```bash
npm run db:seed
```

Lệnh này sẽ tạo:
- Roles: Admin, User
- Admin user: admin@quanlyvt.com / Admin@123
- User: user@quanlyvt.com / User@123

## Bước 4: Chạy Development Server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: **http://localhost:3000**

## Truy cập ứng dụng

1. Mở trình duyệt và truy cập: http://localhost:3000
2. Đăng nhập với:
   - **Email**: admin@quanlyvt.com
   - **Password**: Admin@123

## Troubleshooting

### Lỗi kết nối database
- Kiểm tra PostgreSQL đang chạy
- Kiểm tra `DATABASE_URL` trong file `.env`
- Đảm bảo database `hoagiang_manager` đã được tạo

### Lỗi migration
- Đảm bảo PostgreSQL đang chạy
- Kiểm tra quyền truy cập database
- Thử tạo database trước: `CREATE DATABASE hoagiang_manager;`

### Lỗi khi chạy npm run dev
- Xóa thư mục `.next` nếu có và chạy lại
- Kiểm tra port 3000 có đang bị chiếm không

