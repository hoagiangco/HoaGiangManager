# HoaGiang Manager

Hệ thống quản lý vật tư/thiết bị được chuyển đổi từ ASP.NET Core sang Next.js + Node.js + PostgreSQL.

## Công nghệ sử dụng

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Node.js, Express
- **Database**: PostgreSQL
- **Authentication**: JWT + Passport.js
- **Styling**: Bootstrap (giữ nguyên từ dự án gốc)

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Tạo file `.env` từ `.env.example` và cấu hình:
```bash
cp .env.example .env
```

3. Cấu hình database PostgreSQL trong file `.env`:
```
DATABASE_URL=postgresql://username:password@localhost:5432/hoagiang_manager
```

4. Chạy migrations:
```bash
npm run db:migrate
```

5. Seed dữ liệu mặc định (roles và admin user):
```bash
npm run db:seed
```

6. Chạy development server:
```bash
npm run dev
```

## Tài khoản mặc định

### Admin
- Email: `admin@quanlyvt.com`
- Password: `Admin@123`

### User
- Email: `user@quanlyvt.com`
- Password: `User@123`

## Cấu trúc dự án

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   └── layout.tsx         # Root layout
├── lib/                   # Utility libraries
│   ├── db/               # Database connection
│   ├── auth/             # Authentication utilities
│   └── services/         # Business logic services
├── components/            # React components
├── types/                 # TypeScript types
├── scripts/               # Database scripts
│   ├── migrate.js       # Database migrations
│   └── seed.js          # Seed data
└── public/                # Static files
```

## Migration từ ASP.NET Core

Dự án này được chuyển đổi từ:
- ASP.NET Core MVC → Next.js
- Razor Pages + jQuery → React Components
- SQL Server → PostgreSQL
- ASP.NET Identity → JWT + Passport.js

