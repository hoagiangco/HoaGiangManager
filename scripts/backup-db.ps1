# Script backup PostgreSQL cho HoaGiangManager
# Định dạng: Custom Dump (-Fc) - Tốt nhất để restore trên pgAdmin4

$timestamp = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
$backupDir = Join-Path $PSScriptRoot "../backups"
$filename = "backup-$timestamp.dump"
$filepath = Join-Path $backupDir $filename

# Tạo thư mục backup nếu chưa có
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
}

# Lấy DATABASE_URL từ .env.local
$envFile = Join-Path $PSScriptRoot "../.env.local"
if (Test-Path $envFile) {
    $dbUrl = Get-Content $envFile | Select-String "DATABASE_URL=" | ForEach-Object { $_.ToString().Split('=')[1].Trim() }
}

if (!$dbUrl) {
    Write-Host "Lỗi: Không tìm thấy DATABASE_URL trong .env.local" -ForegroundColor Red
    exit
}

Write-Host "--- Bat dau Backup Database ---" -ForegroundColor Cyan
Write-Host "Dich: $filepath"

# Tìm pg_dump.exe (thường ở C:\Program Files\PostgreSQL\...\bin)
$pgDump = "pg_dump.exe"
if (!(Get-Command $pgDump -ErrorAction SilentlyContinue)) {
    # Thử tìm trong các đường dẫn mặc định
    $searchPaths = @(
        "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
        "C:\Program Files\PostgreSQL\15\bin\pg_dump.exe"
    )
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $pgDump = $path
            break
        }
    }
}

# Chạy lệnh pg_dump
# --no-owner: Không backup thông tin owner (tránh lỗi khi restore sang user khác)
# --no-privileges: Không backup quyền (tránh lỗi permission)
# --clean --if-exists: Thêm lệnh xóa bảng trước khi tạo (giúp restore đè dễ dàng)
# --format=c: Định dạng Custom (nén, đầy đủ, pgAdmin thích cái này)
& $pgDump --no-owner --no-privileges --clean --if-exists --format=c --blobs --verbose --file="$filepath" "$dbUrl"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[THANH CONG]" -ForegroundColor Green
    Write-Host "File backup: $filename"
    Write-Host "Vi tri: $filepath"
    Write-Host "`nCach restore tren pgAdmin4:" -ForegroundColor Yellow
    Write-Host "1. Chuot phai vao Database can restore"
    Write-Host "2. Chon 'Restore'"
    Write-Host "3. O muc 'Filename', chon file: $filename"
    Write-Host "4. Nhan nut 'Restore' o duoi cung"
} else {
    Write-Host "`n[LOI] Backup that bai. Kiem tra xem pg_dump co trong PATH khong." -ForegroundColor Red
}

Pause
