import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db/index';
import { logAudit } from '@/lib/services/auditService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được luân chuyển thiết bị' },
        { status: 403 }
      );
    }

    const deviceId = parseInt(params.id);
    const body = await request.json();
    const { targetDepartmentId, targetLocationId, notes } = body;

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Get current device info
      const currentResult = await client.query(
        'SELECT "DepartmentID", "LocationID" FROM "Device" WHERE "ID" = $1',
        [deviceId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Không tìm thấy thiết bị');
      }

      const currentDevice = currentResult.rows[0];
      const fromDepartmentId = currentDevice.DepartmentID;
      const fromLocationId = currentDevice.LocationID;

      // 2. Insert into DeviceTransfers
      await client.query(
        `INSERT INTO "DeviceTransfers" 
          ("DeviceId", "FromDepartmentId", "ToDepartmentId", "FromLocationId", "ToLocationId", "TransferredByUserId", "Notes") 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          deviceId,
          fromDepartmentId,
          targetDepartmentId,
          fromLocationId,
          targetLocationId,
          user.userId,
          notes || ''
        ]
      );

      // 3. Update Device
      await client.query(
        'UPDATE "Device" SET "DepartmentID" = $1, "LocationID" = $2 WHERE "ID" = $3',
        [targetDepartmentId, targetLocationId, deviceId]
      );

      // 4. Log audit
      await logAudit(
        client,
        user.userId,
        'UPDATE',
        'Device',
        deviceId.toString(),
        { DepartmentID: fromDepartmentId, LocationID: fromLocationId },
        { DepartmentID: targetDepartmentId, LocationID: targetLocationId },
        request.headers.get('x-forwarded-for') || request.ip
      );

      await client.query('COMMIT');
      
      return NextResponse.json({ status: true, message: 'Luân chuyển thiết bị thành công' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Transfer device error:', error);
    return NextResponse.json(
      { 
        status: false, 
        error: error.message || 'Đã xảy ra lỗi khi luân chuyển thiết bị',
      },
      { status: 500 }
    );
  }
}
