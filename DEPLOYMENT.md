# Hướng dẫn Triển khai Production

Hướng dẫn chi tiết để triển khai HoaGiang Manager lên môi trường production.

## Prerequisites

- Node.js 20+ hoặc Docker
- PostgreSQL 12+ database
- Domain name và SSL certificate (khuyến nghị)

## Các Phương thức Triển khai

### 1. Triển khai với Docker (Khuyến nghị)

#### Bước 1: Cấu hình Environment Variables

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Cập nhật các giá trị trong `.env`:

```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@db-host:5432/hoagiang_manager
JWT_SECRET=your-strong-secret-key-minimum-32-characters
JWT_EXPIRES_IN=24h
POSTGRES_PASSWORD=strong-password-for-postgres
```

#### Bước 2: Build và Chạy với Docker Compose

```bash
# Build và start services
docker-compose up -d

# Xem logs
docker-compose logs -f app

# Stop services
docker-compose down
```

#### Bước 3: Chạy Database Migrations

```bash
# Chạy migrations
docker-compose exec app npm run db:migrate

# Seed dữ liệu mặc định (nếu cần)
docker-compose exec app npm run db:seed
```

### 2. Triển khai Manual (Node.js)

#### Bước 1: Cài đặt Dependencies

```bash
npm ci --only=production
```

#### Bước 2: Build Application

```bash
npm run build
```

#### Bước 3: Chạy Migrations

```bash
npm run db:migrate
npm run db:seed  # Optional
```

#### Bước 4: Start Production Server

```bash
npm start
```

Hoặc sử dụng PM2 để quản lý process:

```bash
npm install -g pm2
pm2 start npm --name "hoagiang-manager" -- start
pm2 save
pm2 startup
```

### 3. Triển khai trên Vercel

#### Bước 1: Install Vercel CLI

```bash
npm i -g vercel
```

#### Bước 2: Deploy

```bash
vercel --prod
```

#### Bước 3: Cấu hình Environment Variables

Trong Vercel Dashboard:
- Settings → Environment Variables
- Thêm các biến: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, etc.

#### Bước 4: Chạy Migrations

```bash
vercel env pull .env.local
npm run db:migrate
```

### 4. Triển khai trên Railway/Render

#### Railway

1. Connect GitHub repository
2. Add PostgreSQL service
3. Set environment variables
4. Deploy

#### Render

1. Create new Web Service
2. Connect GitHub repository
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Add PostgreSQL database
6. Set environment variables

## Cấu hình Production

### Database

- **Connection Pooling**: Đã được cấu hình trong `lib/db/index.ts`
- **SSL**: Tự động bật khi `NODE_ENV=production`
- **Migrations**: Chạy `npm run db:migrate` sau khi deploy

### Security

1. **JWT Secret**: Đảm bảo sử dụng secret key mạnh (tối thiểu 32 ký tự)
2. **Environment Variables**: Không commit `.env` lên Git
3. **HTTPS**: Sử dụng reverse proxy (Nginx, Caddy) với SSL
4. **CORS**: Cấu hình trong `next.config.js` nếu cần

### File Uploads

- **Local Storage**: `./public/uploads` (mặc định)
- **Cloud Storage**: Khuyến nghị sử dụng S3, Cloudinary, hoặc Azure Blob cho production
- **Max File Size**: Cấu hình trong `.env` (`MAX_FILE_SIZE`)

### Monitoring

- **Health Check**: `GET /api/health` - Kiểm tra trạng thái server và database
- **Logging**: Sử dụng dịch vụ như Sentry, LogRocket, hoặc CloudWatch
- **Uptime Monitoring**: Sử dụng UptimeRobot, Pingdom, etc.

## Reverse Proxy với Nginx

Ví dụ cấu hình Nginx:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase upload size limit
    client_max_body_size 10M;
}
```

## Backup và Recovery

### Database Backup

```bash
# Manual backup
pg_dump -h localhost -U postgres hoagiang_manager > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U postgres hoagiang_manager < backup_20240101.sql
```

### Automated Backups

Sử dụng cron job hoặc dịch vụ backup tự động:

```bash
# Add to crontab
0 2 * * * pg_dump -h localhost -U postgres hoagiang_manager > /backups/backup_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Lỗi Database Connection

1. Kiểm tra `DATABASE_URL` trong `.env`
2. Đảm bảo database server đang chạy
3. Kiểm tra firewall và network rules
4. Test connection: `npm run db:test`

### Lỗi Build

1. Xóa `.next` folder: `rm -rf .next`
2. Xóa `node_modules`: `rm -rf node_modules`
3. Reinstall: `npm ci`
4. Build lại: `npm run build`

### Lỗi Permissions

1. Đảm bảo user có quyền write vào `public/uploads`
2. Với Docker: kiểm tra volume permissions

### Performance Issues

1. Enable caching (Redis, Memcached)
2. Use CDN cho static files
3. Optimize database queries
4. Monitor với APM tools

## Health Check Endpoint

Kiểm tra trạng thái ứng dụng:

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "database": {
    "connected": true,
    "error": null
  }
}
```

## Support

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra logs: `docker-compose logs` hoặc `pm2 logs`
2. Kiểm tra health endpoint
3. Xem lại cấu hình environment variables
4. Kiểm tra database connection

