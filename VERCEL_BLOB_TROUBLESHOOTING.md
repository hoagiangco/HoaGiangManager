# Hướng dẫn Debug Vercel Blob Upload

## Vấn đề: Upload không hoạt động sau khi tạo Blob Store

### Bước 1: Kiểm tra Environment Variables trên Vercel

1. **Vào Vercel Dashboard:**
   - Truy cập: https://vercel.com/dashboard
   - Chọn project `hoa-giang-manager`

2. **Kiểm tra Environment Variables:**
   - Vào **Settings** → **Environment Variables**
   - Tìm biến `BLOB_READ_WRITE_TOKEN`
   - **Quan trọng:** Kiểm tra xem nó có được set cho **Production** environment không

3. **Nếu không có `BLOB_READ_WRITE_TOKEN`:**
   - Vào **Storage** → Chọn Blob Store của bạn
   - Kiểm tra xem Blob Store có được link với project chưa
   - Nếu chưa, click **Link** hoặc **Connect** để link với project

### Bước 2: Redeploy Project

Sau khi verify environment variables:

1. **Vào Deployments:**
   - Click vào deployment mới nhất
   - Click **Redeploy** (hoặc đợi Vercel tự động redeploy)

2. **Đợi deploy hoàn tất** (thường 2-5 phút)

### Bước 3: Kiểm tra Logs trên Vercel

1. **Vào Function Logs:**
   - Vào **Deployments** → Chọn deployment mới nhất
   - Click vào tab **Functions** hoặc **Logs**
   - Tìm logs từ `/api/files/upload`

2. **Tìm các log messages:**
   ```
   Upload endpoint called
   Authentication successful, user: ...
   File received: ...
   Blob upload check: { isVercel: true, hasToken: true/false, ... }
   ```

3. **Phân tích logs:**
   - Nếu `hasToken: false` → Environment variable chưa được set
   - Nếu có error từ `@vercel/blob` → Kiểm tra error message cụ thể
   - Nếu `Blob uploaded successfully` → Upload thành công!

### Bước 4: Test Upload

1. Truy cập: `https://your-project.vercel.app`
2. Thử upload file/ảnh
3. Mở **Browser Console** (F12) để xem error messages
4. Kiểm tra **Network tab** để xem response từ `/api/files/upload`

## Các Lỗi Thường Gặp

### Lỗi 1: "BLOB_READ_WRITE_TOKEN not found"
**Nguyên nhân:** Environment variable chưa được set hoặc chưa được link với Blob Store

**Giải pháp:**
1. Vào **Storage** → Chọn Blob Store
2. Đảm bảo Blob Store được link với project
3. Vào **Settings** → **Environment Variables**
4. Verify `BLOB_READ_WRITE_TOKEN` có trong list
5. Redeploy project

### Lỗi 2: "Module not found: @vercel/blob"
**Nguyên nhân:** Package chưa được install

**Giải pháp:**
- Package đã có trong `package.json`
- Vercel sẽ tự động install khi deploy
- Nếu vẫn lỗi, kiểm tra `package.json` có `"@vercel/blob": "^0.25.0"`

### Lỗi 3: "Failed to upload file" (500 error)
**Nguyên nhân:** Có thể do nhiều nguyên nhân

**Giải pháp:**
1. Kiểm tra logs trên Vercel (Bước 3)
2. Xem error message cụ thể trong logs
3. Kiểm tra file size (Vercel có giới hạn 4.5MB cho serverless functions)
4. Kiểm tra Blob Store có bị block không (vào Storage → Blob Store → Settings)

### Lỗi 4: Upload thành công nhưng không thấy file
**Nguyên nhân:** File được lưu trên Blob Storage, không phải trong project files

**Giải pháp:**
- Đây là behavior đúng!
- File sẽ có URL dạng: `https://...vc.blob.vercel-storage.com/...`
- URL này sẽ được trả về trong response từ API
- Kiểm tra response JSON để lấy URL

## Kiểm tra Nhanh

### Test API trực tiếp:

```bash
# Lấy token từ localStorage (sau khi login)
# Sau đó test API:

curl -X POST https://your-project.vercel.app/api/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.jpg"
```

### Kiểm tra Environment Variables:

Vercel tự động inject `BLOB_READ_WRITE_TOKEN` vào runtime. Không cần set manual trong dashboard (trừ khi bạn muốn override).

## Liên hệ Support

Nếu vẫn không hoạt động sau khi thử các bước trên:

1. **Copy logs từ Vercel** (Function Logs)
2. **Copy error message** từ browser console
3. **Kiểm tra Blob Store status** trong Storage dashboard
4. **Kiểm tra Vercel status page** để xem có incident không

## Code đã được cập nhật

- ✅ Sử dụng `dynamic import()` thay vì `require()`
- ✅ Thêm logging chi tiết để debug
- ✅ Check environment variables trước khi upload
- ✅ Better error handling và messages


