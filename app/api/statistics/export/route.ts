import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { format } from 'date-fns';

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
        query += ` AND d."LocationID" = $${paramCount}`;
        params.push(locationId);
        paramCount++;
      }

      if (status && status !== '0') {
        query += ` AND d."Status" = $${paramCount}`;
        params.push(status);
        paramCount++;
      }

      query += ` ORDER BY d."ID" DESC`;

      const result = await pool.query(query, params);

      const deviceStatusMap: Record<number, string> = {
        1: 'Đang sử dụng',
        2: 'Đang sửa chữa',
        3: 'Hư hỏng',
        4: 'Đã thanh lý',
        5: 'Có hư hỏng'
      };

      const formattedData = result.rows.map(row => ({
        'Mã TB': `TB-${row.ID}`,
        'Tên thiết bị': row.Name || '',
        'Serial': row.Serial || '',
        'Danh mục': row.CategoryName || '',
        'Phòng ban': row.DepartmentName || '',
        'Vị trí': row.LocationName || '',
        'Ngày sử dụng': row.UseDate ? format(new Date(row.UseDate), 'dd/MM/yyyy') : '',
        'Hạn bảo hành': row.WarrantyDate ? format(new Date(row.WarrantyDate), 'dd/MM/yyyy') : '',
        'Trạng thái': deviceStatusMap[row.Status] || 'Không xác định',
        'Ghi chú': stripHtml(row.Description || '')
      }));

      return NextResponse.json({ status: true, data: formattedData });
      
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
        query += ` AND d."LocationID" = $${paramCount}`;
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
