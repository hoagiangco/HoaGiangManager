import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { format } from 'date-fns';
import { generateExcelFile } from '@/lib/utils/excelGenerator.server';
import { getVNNow } from '@/lib/utils/dateFormat';

export const dynamic = 'force-dynamic';

function stripHtml(html: string) {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user || (!user.roles?.includes('Admin') && !user.roles?.includes('Manager'))) {
      return NextResponse.json(
        { status: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'devices'; // devices | reports | maintenance
    const departmentId = searchParams.get('departmentId');
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const categoryId = searchParams.get('categoryId');
    const keyword = searchParams.get('search');
    const isPreview = searchParams.get('preview') === 'true';

    if (type === 'devices') {
      let query = `
        SELECT 
          d."ID", d."Name", d."Serial", d."Status", 
          d."UseDate", d."WarrantyDate", d."Description",
          dep."Name" as "DepartmentName",
          loc."Name" as "LocationName",
          cat."Name" as "CategoryName"
        FROM "Device" d
        LEFT JOIN "Department" dep ON d."DepartmentID" = dep."ID"
        LEFT JOIN "Location" loc ON d."LocationID" = loc."ID"
        LEFT JOIN "DeviceCategory" cat ON d."DeviceCategoryID" = cat."ID"
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (departmentId && departmentId !== '0') {
        query += ` AND d."DepartmentID" = $${paramCount}`;
        params.push(departmentId);
        paramCount++;
      }

      if (locationId && locationId !== '0') {
        query += ` AND d."LocationID" IN (
          WITH RECURSIVE sub_locations AS (
            SELECT "ID" FROM "Location" WHERE "ID" = $${paramCount}
            UNION ALL
            SELECT l."ID" FROM "Location" l
            INNER JOIN sub_locations sl ON l."ParentID" = sl."ID"
          )
          SELECT "ID" FROM sub_locations
        )`;
        params.push(locationId);
        paramCount++;
      }

      if (status && status !== '0') {
        query += ` AND d."Status" = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      if (categoryId && categoryId !== '0') {
        query += ` AND d."DeviceCategoryID" = $${paramCount}`;
        params.push(categoryId);
        paramCount++;
      }

      if (keyword) {
        query += ` AND (LOWER(d."Name") LIKE LOWER($${paramCount}) OR LOWER(d."Serial") LIKE LOWER($${paramCount}))`;
        params.push(`%${keyword}%`);
        paramCount++;
      }

      query += ` ORDER BY d."ID" DESC`;

      const result = await pool.query(query, params);

      const deviceStatusMap: Record<number, string> = {
        1: 'Đang sử dụng',
        2: 'Đang xử lý',
        3: 'Lỗi/Ngưng hoạt động',
        4: 'Đã thanh lý',
        5: 'Chờ xử lý'
      };

      const columnIdsParam = searchParams.get('columns');
      const requestedColumns = columnIdsParam ? columnIdsParam.split(',') : null;

      const allPossibleColumns = [
        { id: 'stt', label: 'STT' },
        { id: 'id', label: 'Mã TB' },
        { id: 'deviceName', label: 'Tên thiết bị' },
        { id: 'deviceSerial', label: 'Serial' },
        { id: 'deviceCategoryName', label: 'Danh mục' },
        { id: 'deviceDepartmentName', label: 'Phòng ban' },
        { id: 'deviceLocationName', label: 'Vị trí' },
        { id: 'useDate', label: 'Ngày sử dụng' },
        { id: 'statusName', label: 'Trạng thái' },
        { id: 'notes', label: 'Ghi chú' }
      ];

      // Filter and sort columns based on requestedColumns
      let finalColumns = allPossibleColumns;
      if (requestedColumns) {
         finalColumns = requestedColumns
            .map(id => allPossibleColumns.find(c => c.id.toLowerCase() === id.toLowerCase()))
            .filter(Boolean) as { id: string, label: string }[];
      }

      if (isPreview) {
        const formattedData = result.rows.map(row => {
          const item: any = {};
          finalColumns.forEach(col => {
            switch (col.id.toLowerCase()) {
              case 'id': item.id = row.ID; break;
              case 'devicename': item.deviceName = row.Name || ''; break;
              case 'deviceserial': item.deviceSerial = row.Serial || ''; break;
              case 'devicecategoryname': item.deviceCategoryName = row.CategoryName || ''; break;
              case 'devicedepartmentname': item.deviceDepartmentName = row.DepartmentName || ''; break;
              case 'devicelocationname': item.deviceLocationName = row.LocationName || ''; break;
              case 'statusname': item.statusName = deviceStatusMap[row.Status] || 'Không xác định'; break;
              case 'usedate': item.useDate = row.UseDate ? format(new Date(row.UseDate), 'yyyy-MM-dd') : ''; break;
              case 'notes': item.notes = stripHtml(row.Description || ''); break;
            }
          });
          return item;
        });
        return NextResponse.json({ status: true, data: formattedData });
      }

      // Professional Excel Export for A4 Landscape
      const excelHeaders = finalColumns.map(c => c.label);
      const excelRows = result.rows.map((row, idx) => {
        return finalColumns.map(col => {
          switch (col.id.toLowerCase()) {
            case 'stt': return idx + 1;
            case 'id': return `TB-${row.ID}`;
            case 'devicename': return row.Name || '';
            case 'deviceserial': return row.Serial || '';
            case 'devicecategoryname': return row.CategoryName || '';
            case 'devicedepartmentname': return row.DepartmentName || '';
            case 'devicelocationname': return row.LocationName || '';
            case 'usedate': return row.UseDate ? format(new Date(row.UseDate), 'dd/MM/yyyy') : '';
            case 'statusname': return deviceStatusMap[row.Status] || 'Không xác định';
            case 'notes': return stripHtml(row.Description || '');
            default: return '';
          }
        });
      });

      const excelBuffer = await generateExcelFile({
        title: 'DANH SÁCH THIẾT BỊ',
        department: departmentId && departmentId !== '0' ? (result.rows[0]?.DepartmentName || 'Tất cả') : 'Tất cả bộ phận',
        dateRange: `Ngày xuất: ${format(getVNNow(), 'dd/MM/yyyy')}`,
        headers: excelHeaders,
        rows: excelRows,
        fileName: 'Danh_Sach_Thiet_Bi.xlsx'
      });

      return new NextResponse(excelBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="Danh_Sach_Thiet_Bi.xlsx"`,
        },
      });
      
    } else if (type === 'maintenance') {
      let query = `
        SELECT 
          e."ID", e."Title", e."Status", e."EventDate", e."StartDate", e."EndDate",
          e."Description", e."Notes",
          t."Name" as "EventTypeName",
          d."Name" as "DeviceName",
          d."Serial" as "DeviceSerial",
          dep."Name" as "DepartmentName",
          s."Name" as "StaffName"
        FROM "Event" e
        LEFT JOIN "EventType" t ON e."EventTypeID" = t."ID"
        LEFT JOIN "Device" d ON e."DeviceID" = d."ID"
        LEFT JOIN "Department" dep ON d."DepartmentID" = dep."ID"
        LEFT JOIN "Staff" s ON e."StaffID" = s."ID"
        WHERE t."Category" = 'maintenance'
      `;
      const params: any[] = [];
      let paramCount = 1;

      if (departmentId && departmentId !== '0') {
        query += ` AND d."DepartmentID" = $${paramCount}`;
        params.push(departmentId);
        paramCount++;
      }

      if (locationId && locationId !== '0') {
        query += ` AND d."LocationID" IN (
          WITH RECURSIVE sub_locations AS (
            SELECT "ID" FROM "Location" WHERE "ID" = $${paramCount}
            UNION ALL
            SELECT l."ID" FROM "Location" l
            INNER JOIN sub_locations sl ON l."ParentID" = sl."ID"
          )
          SELECT "ID" FROM sub_locations
        )`;
        params.push(locationId);
        paramCount++;
      }

      if (fromDate && toDate) {
        query += ` AND e."EventDate" >= $${paramCount} AND e."EventDate" <= $${paramCount + 1}`;
        params.push(fromDate, toDate);
        paramCount += 2;
      }

      query += ` ORDER BY e."EventDate" DESC`;

      const result = await pool.query(query, params);

      const statusMap: Record<string, string> = {
        'planned': 'Theo kế hoạch',
        'in_progress': 'Đang thực hiện',
        'completed': 'Đã hoàn thành',
        'cancelled': 'Đã hủy',
        'missed': 'Bỏ qua'
      };

      const formattedData = result.rows.map(row => ({
        'Mã BT': `BT-${row.ID}`,
        'Tiêu đề': row.Title || '',
        'Loại bảo trì': row.EventTypeName || '',
        'Tên thiết bị': row.DeviceName || '',
        'Serial': row.DeviceSerial || '',
        'Phòng ban': row.DepartmentName || '',
        'Người thực hiện': row.StaffName || '',
        'Ngày dự kiến': row.EventDate ? format(new Date(row.EventDate), 'dd/MM/yyyy') : '',
        'Ngày bắt đầu': row.StartDate ? format(new Date(row.StartDate), 'dd/MM/yyyy HH:mm') : '',
        'Ngày hoàn thành': row.EndDate ? format(new Date(row.EndDate), 'dd/MM/yyyy HH:mm') : '',
        'Trạng thái': statusMap[row.Status] || row.Status,
        'Nội dung': stripHtml(row.Description || ''),
        'Kết quả/Ghi chú': stripHtml(row.Notes || '')
      }));

      return NextResponse.json({ status: true, data: formattedData });
    }

    return NextResponse.json({ status: false, error: 'Invalid type format' });
  } catch (error: any) {
    console.error('Statistics Export API Error:', error);
    return NextResponse.json(
      { status: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
