# Fix Vercel Preview → Production

## Vấn đề: Deployments hiển thị "Preview" thay vì "Production"

Khi tất cả deployments đều hiển thị "Preview" mặc dù branch là `production`, có nghĩa là Vercel chưa được cấu hình để tự động promote lên Production.

## Cách khắc phục:

### Cách 1: Promote Deployment thủ công (Nhanh nhất)

1. Vào Vercel Dashboard → Deployments
2. Tìm deployment mới nhất (commit `5896f0c` hoặc `201903e`)
3. Click vào deployment đó
4. Ở góc trên bên phải, tìm nút **"..."** (3 dots menu)
5. Click **"Promote to Production"**
6. Xác nhận

Sau khi promote, deployment sẽ chuyển từ "Preview" sang "Production" và code mới sẽ được deploy lên production domain.

### Cách 2: Cấu hình Production Branch (Tự động)

1. Vào **Settings** → **Git**
2. Tìm phần **"Production Branch"**
3. Đảm bảo đã chọn branch `production`
4. Nếu chưa:
   - Click **"Edit"**
   - Chọn branch `production` từ dropdown
   - Click **"Save"**
5. Sau khi save, các deployment từ branch `production` sẽ tự động được promote lên Production

### Cách 3: Kiểm tra Domain Settings

1. Vào **Settings** → **Domains**
2. Kiểm tra xem có production domain nào được cấu hình không
3. Nếu chưa có, thêm domain:
   - Click **"Add Domain"**
   - Nhập domain (ví dụ: `hoa-giang-manager.vercel.app` hoặc custom domain)
   - Chọn **"Production"** environment
   - Save

## Sau khi fix:

1. Đợi deployment mới nhất được promote lên Production
2. Hard refresh browser: `Ctrl + Shift + R`
3. Kiểm tra lại FileManager có nút Refresh không

## Lưu ý:

- **Preview deployments** chỉ được deploy lên preview URLs (ví dụ: `hoa-giang-manager-git-production-xxx.vercel.app`)
- **Production deployments** mới được deploy lên production domain chính (ví dụ: `hoa-giang-manager.vercel.app`)
- Nếu bạn đang truy cập production domain nhưng code không update, có thể do đang xem preview deployment

