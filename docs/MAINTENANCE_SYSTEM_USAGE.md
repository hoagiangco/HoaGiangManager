# HƯỚNG DẪN SỬ DỤNG HỆ THỐNG BẢO TRÌ

## 📋 Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Tạo Kế Hoạch Bảo Trì](#tạo-kế-hoạch-bảo-trì)
3. [Xem Kế Hoạch Sắp Đến Hạn](#xem-kế-hoạch-sắp-đến-hạn)
4. [Xem Batch Bảo Trì](#xem-batch-bảo-trì)
5. [Xem Lịch Sử Bảo Trì Theo Thiết Bị](#xem-lịch-sử-bảo-trì-theo-thiết-bị)
6. [Scheduled Job - Tự Động Tạo Event](#scheduled-job---tự-động-tạo-event)
7. [Ví Dụ Code Frontend](#ví-dụ-code-frontend)

---

## Tổng Quan

Hệ thống bảo trì cho phép bạn:
- ✅ Tạo kế hoạch bảo trì định kỳ cho một hoặc nhiều thiết bị
- ✅ Tự động nhận thông báo khi sắp đến hạn
- ✅ Tự động tạo Event khi đến hạn
- ✅ Theo dõi tiến độ bảo trì theo batch
- ✅ Xem lịch sử bảo trì của từng thiết bị

---

## Tạo Kế Hoạch Bảo Trì

### API Endpoint
```
POST /api/device-reminder-plans/bulk
```

### Request Body

#### Ví dụ 1: Bảo trì cho tất cả thiết bị trong một category
```json
{
  "categoryId": 5,
  "eventTypeId": 10,
  "title": "Bảo trì định kỳ máy lạnh",
  "description": "Bảo trì hệ thống máy lạnh công ty 6 tháng một lần",
  "intervalValue": 6,
  "intervalUnit": "month",
  "startFrom": "2024-01-15",
  "endAt": "2025-12-31",
  "metadata": {
    "maintenanceType": "outsource",
    "maintenanceProvider": "Công ty ABC",
    "cost": 500000
  }
}
```

#### Ví dụ 2: Bảo trì cho danh sách thiết bị cụ thể
```json
{
  "deviceIds": [1, 2, 3, 5, 8],
  "eventTypeId": 10,
  "title": "Bảo trì máy in",
  "intervalValue": 3,
  "intervalUnit": "month",
  "startFrom": "2024-01-15",
  "metadata": {
    "maintenanceType": "internal"
  }
}
```

### Response
```json
{
  "status": true,
  "data": {
    "created": 10,
    "plans": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    "maintenanceBatchId": "batch-2024-01-15-1705296000000"
  }
}
```

### Các Trường Bắt Buộc

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| `eventTypeId` | ID loại sự kiện bảo trì | `10` |
| `intervalValue` | Giá trị khoảng thời gian | `6` |
| `intervalUnit` | Đơn vị: `day`, `week`, `month`, `year` | `"month"` |
| `startFrom` | Ngày bắt đầu (YYYY-MM-DD) | `"2024-01-15"` |

### Các Trường Tùy Chọn

| Trường | Mô tả | Ví dụ |
|--------|-------|-------|
| `deviceIds` | Danh sách ID thiết bị (ưu tiên) | `[1, 2, 3]` |
| `categoryId` | ID category thiết bị | `5` |
| `title` | Tiêu đề kế hoạch | `"Bảo trì định kỳ"` |
| `description` | Mô tả chi tiết | `"Bảo trì hệ thống..."` |
| `endAt` | Ngày kết thúc (YYYY-MM-DD) | `"2025-12-31"` |
| `metadata.maintenanceType` | Loại: `"internal"` hoặc `"outsource"` | `"outsource"` |
| `metadata.maintenanceProvider` | Nhà cung cấp (nếu outsource) | `"Công ty ABC"` |
| `metadata.cost` | Chi phí dự kiến | `500000` |

**Lưu ý:** Phải cung cấp ít nhất một trong: `deviceIds` hoặc `categoryId`

---

## Xem Kế Hoạch Sắp Đến Hạn

### API Endpoint
```
GET /api/device-reminder-plans/upcoming?days=7&notificationDays=3,7
```

### Query Parameters

| Parameter | Mô tả | Mặc định | Ví dụ |
|-----------|-------|----------|-------|
| `days` | Số ngày trong tương lai để kiểm tra | `7` | `14` |
| `notificationDays` | Danh sách số ngày trước khi đến hạn để thông báo | (tất cả) | `"3,7"` |

### Ví Dụ Request

```javascript
// Lấy tất cả kế hoạch trong 7 ngày tới
GET /api/device-reminder-plans/upcoming?days=7

// Lấy kế hoạch cần thông báo trong 3 và 7 ngày tới
GET /api/device-reminder-plans/upcoming?days=14&notificationDays=3,7
```

### Response
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "deviceId": 5,
      "deviceName": "Máy lạnh phòng 101",
      "nextDueDate": "2024-01-22",
      "daysUntilDue": 3,
      "title": "Bảo trì định kỳ máy lạnh",
      "description": "Bảo trì hệ thống máy lạnh công ty",
      "maintenanceType": "outsource",
      "maintenanceProvider": "Công ty ABC",
      "maintenanceBatchId": "batch-2024-01-15-001",
      "shouldNotify": true
    }
  ]
}
```

---

## Xem Batch Bảo Trì

### API Endpoint
```
GET /api/events/maintenance-batches
```

### Response
```json
{
  "status": true,
  "data": [
    {
      "batchId": "batch-2024-01-15-001",
      "title": "Bảo trì định kỳ máy lạnh",
      "totalDevices": 10,
      "completed": 8,
      "inProgress": 1,
      "planned": 1,
      "cancelled": 0,
      "progressPercentage": 80
    }
  ]
}
```

### Giải Thích

- `totalDevices`: Tổng số thiết bị trong batch
- `completed`: Số thiết bị đã hoàn thành bảo trì
- `inProgress`: Số thiết bị đang tiến hành bảo trì
- `planned`: Số thiết bị đã lên kế hoạch nhưng chưa bắt đầu
- `cancelled`: Số thiết bị đã hủy
- `progressPercentage`: Phần trăm hoàn thành (tính trên tổng số thiết bị không bị hủy)

---

## Xem Chi Tiết Batch Bảo Trì

### API Endpoint
```
GET /api/events/batch/:batchId
```

### Ví Dụ Request
```
GET /api/events/batch/batch-2024-01-15-001
```

### Response
```json
{
  "status": true,
  "data": [
    {
      "id": 10,
      "title": "Bảo trì định kỳ",
      "deviceId": 5,
      "deviceName": "Máy lạnh phòng 101",
      "eventTypeId": 10,
      "eventTypeName": "Bảo trì định kỳ",
      "description": "Bảo trì hệ thống máy lạnh",
      "status": "completed",
      "eventDate": "2024-01-15",
      "startDate": "2024-01-15",
      "endDate": "2024-01-15",
      "staffId": 1,
      "staffName": "Nguyễn Văn A",
      "maintenanceBatchId": "batch-2024-01-15-001",
      "maintenanceType": "outsource",
      "maintenanceProvider": "Công ty ABC",
      "createdAt": "2024-01-15T09:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## Xem Lịch Sử Bảo Trì Theo Thiết Bị

### API Endpoint
```
GET /api/devices/:id/events
```

### Ví Dụ Request
```
GET /api/devices/5/events
```

### Response
```json
{
  "status": true,
  "data": [
    {
      "id": 10,
      "title": "Bảo trì định kỳ",
      "eventDate": "2024-01-15",
      "endDate": "2024-01-15",
      "status": "completed",
      "eventTypeName": "Bảo trì định kỳ",
      "description": "Bảo trì hệ thống máy lạnh",
      "maintenanceBatchId": "batch-2024-01-15-001",
      "maintenanceType": "outsource",
      "maintenanceProvider": "Công ty ABC",
      "createdAt": "2024-01-15T09:00:00.000Z"
    },
    {
      "id": 8,
      "title": "Bảo trì định kỳ",
      "eventDate": "2023-07-15",
      "endDate": "2023-07-15",
      "status": "completed",
      "eventTypeName": "Bảo trì định kỳ",
      "maintenanceBatchId": "batch-2023-07-15-001",
      "maintenanceType": "outsource",
      "createdAt": "2023-07-15T09:00:00.000Z"
    }
  ]
}
```

---

## Scheduled Job - Tự Động Tạo Event

### Mục Đích

Script này chạy hàng ngày để:
1. Kiểm tra các kế hoạch bảo trì có `nextDueDate` = hôm nay
2. Tự động tạo Event với status `Planned` cho từng thiết bị
3. Cập nhật `nextDueDate` mới dựa trên interval
4. Tự động deactivate plan khi vượt quá `endAt`

### Chạy Thủ Công

```bash
npm run check-reminders
```

### Thiết Lập Cron Job (Linux/Mac)

#### Cách 1: Sử dụng crontab

1. Mở crontab editor:
```bash
crontab -e
```

2. Thêm dòng sau để chạy lúc 9 giờ sáng mỗi ngày:
```bash
0 9 * * * cd /path/to/HoaGiangManager && npm run check-reminders >> /var/log/maintenance-reminders.log 2>&1
```

#### Cách 2: Sử dụng PM2 (Khuyến nghị cho Node.js)

1. Cài đặt PM2:
```bash
npm install -g pm2
```

2. Tạo file `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'maintenance-reminders',
      script: 'npm',
      args: 'run check-reminders',
      cron_restart: '0 9 * * *',
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

3. Khởi động với PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Thiết Lập Task Scheduler (Windows)

1. Mở Task Scheduler (Windows)
2. Tạo Task mới:
   - **Name**: `Maintenance Reminders Check`
   - **Trigger**: Daily at 9:00 AM
   - **Action**: Start a program
   - **Program**: `npm`
   - **Arguments**: `run check-reminders`
   - **Start in**: `E:\Web Project\Nextjs\HoaGiangManager`

### Log Output

Khi chạy script, bạn sẽ thấy output như sau:

```
=== Bắt đầu kiểm tra kế hoạch bảo trì ===
Thời gian: 2024-01-15T09:00:00.000Z
Tìm thấy 5 kế hoạch đến hạn hôm nay
Đã tạo Event 10 cho Device 5
Đã cập nhật Plan 1 với nextDueDate mới: 2024-07-15
Đã tạo Event 11 cho Device 6
Đã cập nhật Plan 2 với nextDueDate mới: 2024-07-15
...

=== Kết quả ===
- Đã tạo 5 Event
- Đã cập nhật 5 Plan
- Lỗi: 0
=== Hoàn thành ===
```

---

## Ví Dụ Code Frontend

### 1. Tạo Kế Hoạch Bảo Trì (React/Next.js)

```typescript
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';

interface CreateMaintenancePlanParams {
  deviceIds?: number[];
  categoryId?: number;
  eventTypeId: number;
  title: string;
  description?: string;
  intervalValue: number;
  intervalUnit: 'day' | 'week' | 'month' | 'year';
  startFrom: string; // YYYY-MM-DD
  endAt?: string; // YYYY-MM-DD
  metadata?: {
    maintenanceType?: 'internal' | 'outsource';
    maintenanceProvider?: string;
    cost?: number;
  };
}

async function createMaintenancePlan(params: CreateMaintenancePlanParams) {
  try {
    const response = await api.post('/device-reminder-plans/bulk', params);
    
    if (response.data.status) {
      toast.success(`Đã tạo ${response.data.data.created} kế hoạch bảo trì`);
      return response.data.data;
    } else {
      toast.error(response.data.error || 'Lỗi khi tạo kế hoạch');
      return null;
    }
  } catch (error: any) {
    console.error('Error creating maintenance plan:', error);
    toast.error(error.response?.data?.error || 'Lỗi khi tạo kế hoạch');
    return null;
  }
}

// Sử dụng
const handleCreatePlan = async () => {
  const result = await createMaintenancePlan({
    categoryId: 5,
    eventTypeId: 10,
    title: 'Bảo trì định kỳ máy lạnh',
    intervalValue: 6,
    intervalUnit: 'month',
    startFrom: '2024-01-15',
    endAt: '2025-12-31',
    metadata: {
      maintenanceType: 'outsource',
      maintenanceProvider: 'Công ty ABC',
      cost: 500000
    }
  });
  
  if (result) {
    console.log('Batch ID:', result.maintenanceBatchId);
  }
};
```

### 2. Lấy Danh Sách Kế Hoạch Sắp Đến Hạn

```typescript
interface UpcomingPlan {
  id: number;
  deviceId: number;
  deviceName: string;
  nextDueDate: string;
  daysUntilDue: number;
  title: string;
  maintenanceType: 'internal' | 'outsource' | null;
  maintenanceProvider: string | null;
  shouldNotify: boolean;
}

async function getUpcomingPlans(
  days: number = 7,
  notificationDays?: number[]
): Promise<UpcomingPlan[]> {
  try {
    const notificationDaysParam = notificationDays?.join(',');
    const url = `/device-reminder-plans/upcoming?days=${days}${
      notificationDaysParam ? `&notificationDays=${notificationDaysParam}` : ''
    }`;
    
    const response = await api.get(url);
    
    if (response.data.status) {
      return response.data.data;
    } else {
      toast.error(response.data.error || 'Lỗi khi lấy danh sách');
      return [];
    }
  } catch (error: any) {
    console.error('Error fetching upcoming plans:', error);
    toast.error('Lỗi khi lấy danh sách kế hoạch');
    return [];
  }
}

// Sử dụng trong component
const [upcomingPlans, setUpcomingPlans] = useState<UpcomingPlan[]>([]);

useEffect(() => {
  const loadUpcomingPlans = async () => {
    const plans = await getUpcomingPlans(7, [3, 7]);
    setUpcomingPlans(plans);
  };
  loadUpcomingPlans();
}, []);
```

### 3. Lấy Danh Sách Batch Bảo Trì

```typescript
interface MaintenanceBatch {
  batchId: string;
  title: string;
  totalDevices: number;
  completed: number;
  inProgress: number;
  planned: number;
  cancelled: number;
  progressPercentage: number;
}

async function getMaintenanceBatches(): Promise<MaintenanceBatch[]> {
  try {
    const response = await api.get('/events/maintenance-batches');
    
    if (response.data.status) {
      return response.data.data;
    } else {
      toast.error(response.data.error || 'Lỗi khi lấy danh sách batch');
      return [];
    }
  } catch (error: any) {
    console.error('Error fetching batches:', error);
    return [];
  }
}
```

### 4. Lấy Chi Tiết Batch

```typescript
async function getBatchDetails(batchId: string) {
  try {
    const response = await api.get(`/events/batch/${batchId}`);
    
    if (response.data.status) {
      return response.data.data;
    } else {
      toast.error(response.data.error || 'Lỗi khi lấy chi tiết batch');
      return [];
    }
  } catch (error: any) {
    console.error('Error fetching batch details:', error);
    return [];
  }
}
```

### 5. Lấy Lịch Sử Bảo Trì Của Thiết Bị

```typescript
async function getDeviceMaintenanceHistory(deviceId: number) {
  try {
    const response = await api.get(`/devices/${deviceId}/events`);
    
    if (response.data.status) {
      return response.data.data;
    } else {
      toast.error(response.data.error || 'Lỗi khi lấy lịch sử');
      return [];
    }
  } catch (error: any) {
    console.error('Error fetching device history:', error);
    return [];
  }
}
```

---

## Workflow Thực Tế

### Scenario: Bảo Trì Hệ Thống Máy Lạnh Công Ty

1. **Tạo Kế Hoạch** (Tháng 1/2024)
   ```javascript
   await createMaintenancePlan({
     categoryId: 5, // Category: Máy lạnh
     eventTypeId: 10,
     title: 'Bảo trì định kỳ máy lạnh',
     intervalValue: 6,
     intervalUnit: 'month',
     startFrom: '2024-01-15',
     endAt: '2025-12-31',
     metadata: {
       maintenanceType: 'outsource',
       maintenanceProvider: 'Công ty ABC'
     }
   });
   ```
   → Tạo 10 kế hoạch cho 10 máy lạnh, tất cả có cùng `maintenanceBatchId`

2. **Kiểm Tra Sắp Đến Hạn** (Tháng 7/2024)
   ```javascript
   const upcoming = await getUpcomingPlans(7, [3, 7]);
   // Trả về các máy lạnh sẽ đến hạn trong 7 ngày tới
   ```

3. **Scheduled Job Tự Động Tạo Event** (Ngày 15/7/2024)
   - Script chạy lúc 9h sáng
   - Tự động tạo 10 Event với status `Planned`
   - Cập nhật `nextDueDate` mới = 15/1/2025

4. **Hoàn Thành Bảo Trì**
   - User cập nhật Event status = `Completed`
   - Hệ thống tự động set `endDate` = ngày hiện tại

5. **Xem Tiến Độ Batch**
   ```javascript
   const batches = await getMaintenanceBatches();
   // Xem tổng quan: 8/10 đã hoàn thành = 80%
   ```

6. **Xem Lịch Sử Thiết Bị**
   ```javascript
   const history = await getDeviceMaintenanceHistory(5);
   // Xem tất cả lịch sử bảo trì của máy lạnh số 5
   ```

---

## Troubleshooting

### Lỗi: "Phải cung cấp deviceIds hoặc categoryId"
→ Kiểm tra request body có ít nhất một trong hai trường trên

### Lỗi: "IntervalValue phải lớn hơn 0"
→ Đảm bảo `intervalValue` là số nguyên dương

### Lỗi: "StartFrom là bắt buộc"
→ Đảm bảo format ngày là `YYYY-MM-DD`

### Scheduled Job không chạy
→ Kiểm tra:
- Cron job đã được setup đúng chưa
- Path đến project có đúng không
- Database connection có hoạt động không
- Log file có ghi lỗi gì không

---

## Tài Liệu Tham Khảo

- [Thiết Kế Hệ Thống](./MAINTENANCE_SYSTEM_DESIGN.md)
- [API Documentation](../app/api/device-reminder-plans/bulk/route.ts)
- [Scheduled Job Script](../scripts/check-maintenance-reminders.ts)

