import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db/index';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });

    const deviceId = parseInt(params.id);

    const query = `
      SELECT t.*, 
             u."FullName" as "TransferredByName",
             fd."Name" as "FromDepartmentName",
             td."Name" as "ToDepartmentName",
             fl."Name" as "FromLocationName",
             tl."Name" as "ToLocationName"
      FROM "DeviceTransfers" t
      LEFT JOIN "AspNetUsers" u ON t."TransferredByUserId" = u."Id"
      LEFT JOIN "Department" fd ON t."FromDepartmentId" = fd."ID"
      LEFT JOIN "Department" td ON t."ToDepartmentId" = td."ID"
      LEFT JOIN "Location" fl ON t."FromLocationId" = fl."ID"
      LEFT JOIN "Location" tl ON t."ToLocationId" = tl."ID"
      WHERE t."DeviceId" = $1
      ORDER BY t."TransferDate" DESC
    `;
    
    const result = await pool.query(query, [deviceId]);

    return NextResponse.json({
      status: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Get device transfers error:', error);
    return NextResponse.json({ status: false, error: 'Đã xảy ra lỗi' }, { status: 500 });
  }
}
