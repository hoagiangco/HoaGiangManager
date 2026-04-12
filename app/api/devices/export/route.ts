import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { formatDateDisplay } from '@/lib/utils/dateFormat';
import { generateExcelFile } from '@/lib/utils/excelGenerator.server';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const cateId = searchParams.get('cateId');
    const departmentId = searchParams.get('departmentId');
    const locationId = searchParams.get('locationId');
    const status = searchParams.get('status');
    const isPreview = searchParams.get('preview') === 'true';

    // Build query
    let query = `
      SELECT 
        d."ID" as id,
        d."Name" as name,
        d."Serial" as serial,
        d."WarrantyDate" as "warrantyDate",
        d."UseDate" as "useDate",
        d."EndDate" as "endDate",
        dept."Name" as "departmentName",
        loc."Name" as "locationName",
        cat."Name" as "categoryName",
        d."Status" as status
      FROM "Device" d
      LEFT JOIN "Department" dept ON d."DepartmentId" = dept."ID"
      LEFT JOIN "Location" loc ON d."LocationId" = loc."ID"
      LEFT JOIN "DeviceCategory" cat ON d."DeviceCategoryId" = cat."ID"
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (cateId && cateId !== '0') {
      query += ` AND d."DeviceCategoryId" = $${paramIndex++}`;
      params.push(parseInt(cateId));
    }
    if (departmentId && departmentId !== '0') {
      query += ` AND d."DepartmentId" = $${paramIndex++}`;
      params.push(parseInt(departmentId));
    }
    if (locationId && locationId !== '0') {
      query += ` AND d."LocationId" = $${paramIndex++}`;
      params.push(parseInt(locationId));
    }
    if (status && status !== '0') {
      query += ` AND d."Status" = $${paramIndex++}`;
      params.push(parseInt(status));
    }
    if (searchParams.get('keyword')) {
      query += ` AND (d."Name" ILIKE $${paramIndex} OR d."Serial" ILIKE $${paramIndex})`;
      params.push(`%${searchParams.get('keyword')}%`);
      paramIndex++;
    }

    query += ` ORDER BY d."Name" ASC`;

    const result = await pool.query(query, params);

    const statusMap: Record<number, string> = {
      1: 'Đang sử dụng',
      2: 'Đang sửa chữa',
      3: 'Hư hỏng',
      4: 'Đã thanh lý',
      5: 'Có hư hỏng'
    };

    const exportData = result.rows.map(row => ({
      'ID': row.id,
      'Tên thiết bị': row.name || '',
      'Số Serial': row.serial || '',
      'Phòng ban': row.departmentName || '',
      'Vị trí': row.locationName || '',
      'Danh mục': row.categoryName || '',
      'Trạng thái': statusMap[row.status] || 'N/A',
      'Ngày sử dụng': formatDateDisplay(row.useDate) || '',
      'Bảo hành đến': formatDateDisplay(row.warrantyDate) || '',
      'Ngày thanh lý': formatDateDisplay(row.endDate) || '',
    }));

    if (isPreview) {
      return NextResponse.json({
        status: true,
        data: exportData,
        recordCount: exportData.length
      });
    }

    const fileName = `Danh_sach_thiet_bi_${new Date().toISOString().split('T')[0]}.xlsx`;
    const headers = Object.keys(exportData[0] || {});
    const rows = exportData.map(item => Object.values(item));

    const excelBuffer = await generateExcelFile({
      title: 'DANH SÁCH THIẾT BỊ',
      department: 'Hệ thống quản lý',
      dateRange: `Ngày xuất: ${formatDateDisplay(new Date())}`,
      headers,
      rows,
      fileName,
    });

    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error: any) {
    console.error('Export devices error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Lỗi hệ thống' },
      { status: 500 }
    );
  }
}
