# Hướng dẫn Migration từ ASP.NET Core sang Next.js

## Tổng quan Migration

Dự án đã được chuyển đổi từ:
- **Backend**: ASP.NET Core MVC → Next.js API Routes (Node.js)
- **Frontend**: Razor Pages + jQuery → Next.js React Components
- **Database**: SQL Server → PostgreSQL
- **Authentication**: ASP.NET Identity → JWT + bcryptjs

## Cấu trúc dự án mới

```
HoaGiangManager/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Backend)
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── devices/              # Device CRUD
│   │   ├── departments/          # Department CRUD
│   │   ├── device-categories/    # DeviceCategory CRUD
│   │   ├── staff/                # Staff CRUD
│   │   ├── events/               # Event CRUD
│   │   └── event-types/          # EventType CRUD
│   ├── (auth)/                   # Authentication pages
│   │   ├── login/
│   │   └── register/
│   └── (dashboard)/              # Protected dashboard pages
│       ├── dashboard/            # Home page
│       ├── devices/              # Device management
│       ├── departments/          # Department management
│       └── ...                   # Other pages
├── lib/                          # Shared libraries
│   ├── db/                       # Database connection
│   ├── auth/                     # Authentication utilities
│   ├── services/                 # Business logic services
│   └── utils/                    # Utility functions
├── types/                        # TypeScript type definitions
├── scripts/                      # Database scripts
│   ├── migrate.ts               # Database migrations
│   └── seed.ts                  # Seed data
└── public/                       # Static files
```

## Cài đặt và Chạy

### 1. Cài đặt Dependencies

```bash
npm install
```

### 2. Cấu hình Database

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Cập nhật `DATABASE_URL` trong file `.env`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/hoagiang_manager
```

### 3. Chạy Database Migrations

```bash
npm run db:migrate
```

Lệnh này sẽ tạo tất cả các bảng:
- Identity tables (AspNetUsers, AspNetRoles, etc.)
- Department
- DeviceCategory
- Device
- Staff
- EventType
- Event

### 4. Seed dữ liệu mặc định

```bash
npm run db:seed
```

Tạo các roles và user mặc định:
- **Admin**: admin@quanlyvt.com / Admin@123
- **User**: user@quanlyvt.com / User@123

### 5. Chạy Development Server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: http://localhost:3000

## So sánh với dự án cũ

### Backend (API)

| ASP.NET Core | Next.js |
|--------------|---------|
| Controllers | API Routes (`app/api/**/route.ts`) |
| Services | Services (`lib/services/*.ts`) |
| DbContext | PostgreSQL Pool (`lib/db/index.ts`) |
| Identity | JWT + bcryptjs (`lib/auth/*.ts`) |

### Frontend

| Razor Pages | Next.js |
|-------------|---------|
| `.cshtml` files | React Components (`app/**/page.tsx`) |
| jQuery AJAX | Axios (`lib/utils/api.ts`) |
| Server-side rendering | Client-side rendering (with Next.js SSR support) |

### Database

| SQL Server | PostgreSQL |
|-----------|------------|
| `byte` type | `SMALLINT` |
| `DateOnly` | `DATE` |
| Enum stored as byte | PostgreSQL ENUM type |
| Identity tables | Same structure (AspNetUsers, etc.) |

## API Endpoints

### Authentication
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký

### Devices
- `GET /api/devices?cateId=0` - Lấy danh sách thiết bị
- `POST /api/devices` - Tạo thiết bị mới
- `GET /api/devices/[id]` - Lấy chi tiết thiết bị
- `PUT /api/devices/[id]` - Cập nhật thiết bị
- `DELETE /api/devices/[id]` - Xóa thiết bị

### Departments
- `GET /api/departments` - Lấy danh sách phòng ban
- `POST /api/departments` - Tạo phòng ban mới
- `GET /api/departments/[id]` - Lấy chi tiết phòng ban
- `PUT /api/departments/[id]` - Cập nhật phòng ban
- `DELETE /api/departments/[id]` - Xóa phòng ban

### Device Categories
- `GET /api/device-categories` - Lấy danh sách danh mục
- `POST /api/device-categories` - Tạo danh mục mới
- Tương tự cho các endpoints khác

### Staff
- `GET /api/staff?departmentId=0` - Lấy danh sách nhân viên
- `POST /api/staff` - Tạo nhân viên mới
- Tương tự cho các endpoints khác

### Events
- `GET /api/events?eventTypeId=0` - Lấy danh sách sự kiện
- `POST /api/events` - Tạo sự kiện mới
- Tương tự cho các endpoints khác

### Event Types
- `GET /api/event-types` - Lấy danh sách loại sự kiện
- `POST /api/event-types` - Tạo loại sự kiện mới
- Tương tự cho các endpoints khác

## Authentication Flow

1. User đăng nhập qua `/api/auth/login`
2. Server trả về JWT token
3. Client lưu token vào `localStorage`
4. Mỗi request API tự động thêm header `Authorization: Bearer <token>`
5. Server verify token và trả về dữ liệu

## Các tính năng đã migrate

✅ Authentication & Authorization
✅ User Registration & Login
✅ Role-based Access Control (Admin/User)
✅ Device Management (CRUD)
✅ Department Management (CRUD)
✅ Device Category Management (CRUD)
✅ Staff Management (CRUD)
✅ Event Management (CRUD)
✅ Event Type Management (CRUD)
✅ Device Status Management
✅ Dashboard với thống kê

## Các tính năng chưa migrate

⚠️ File Upload (elFinder) - Cần thay thế bằng Next.js file upload handler
⚠️ Admin Panel - Cần tạo trang quản lý users và roles
⚠️ DataTables - Có thể thêm DataTables cho React nếu cần

## Lưu ý khi Migration

1. **Database Schema**: Tất cả các bảng đã được tạo với cấu trúc tương tự SQL Server
2. **Data Types**: Một số kiểu dữ liệu đã được chuyển đổi (byte → SMALLINT)
3. **Enum Types**: DeviceStatus được lưu dưới dạng ENUM trong PostgreSQL
4. **Authentication**: JWT token thay thế cho Cookie-based authentication
5. **File Upload**: Cần implement file upload handler mới (thay thế elFinder)

## Troubleshooting

### Lỗi kết nối database
- Kiểm tra `DATABASE_URL` trong file `.env`
- Đảm bảo PostgreSQL đang chạy
- Kiểm tra quyền truy cập database

### Lỗi migration
- Xóa và tạo lại database nếu cần
- Kiểm tra các constraints và foreign keys

### Lỗi authentication
- Kiểm tra JWT_SECRET trong `.env`
- Xóa token cũ trong localStorage và đăng nhập lại

## Bước tiếp theo

1. Tạo các trang còn thiếu (Admin, các entity pages)
2. Implement file upload handler
3. Thêm DataTables cho React nếu cần
4. Tối ưu performance và UI/UX
5. Thêm unit tests
6. Deploy lên production

