# Git Branch Strategy cho Vercel

## Vấn đề đã gặp:

Vercel mặc định deploy **Production** từ branch `main`, nhưng chúng ta đang làm việc trên branch `production`. Điều này khiến:
- Deployments từ branch `production` chỉ hiển thị là **"Preview"**
- Code mới không được deploy lên production domain
- Phải promote thủ công mỗi lần

## Giải pháp:

### Option 1: Đổi Production Branch trong Vercel (Khuyến nghị)

1. Vào **Vercel Dashboard** → **Settings** → **Git**
2. Tìm **"Production Branch"**
3. Đổi từ `main` sang `production`
4. Save

Sau đó, mọi deployment từ branch `production` sẽ tự động được promote lên Production.

### Option 2: Merge `production` vào `main` (Nếu muốn dùng `main`)

Nếu muốn giữ `main` làm production branch:

```bash
# Switch to main
git checkout main

# Merge production into main
git merge production

# Push to main
git push ogirin main
```

Sau đó cấu hình Vercel Production Branch là `main`.

### Option 3: Giữ cả 2 branches (Phức tạp hơn)

- `main`: Stable, tested code (Production)
- `production`: Development/Staging branch (Preview)

Workflow:
1. Develop trên `production`
2. Test trên Preview deployments
3. Khi ready, merge `production` → `main`
4. `main` tự động deploy lên Production

## Khuyến nghị:

**Nên dùng Option 1** - Đổi Production Branch thành `production` vì:
- Đơn giản nhất
- Không cần thay đổi workflow hiện tại
- Tự động deploy từ branch đang làm việc

## Kiểm tra sau khi fix:

1. Push code lên branch `production`
2. Vào Vercel Dashboard → Deployments
3. Deployment mới sẽ tự động hiển thị là **"Production"** (không phải "Preview")
4. Code sẽ tự động deploy lên production domain

