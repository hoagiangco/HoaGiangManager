import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticate(req);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await pool.query(
      `SELECT s.*, d."Name" as "departmentName"
       FROM "Staff" s
       LEFT JOIN "Department" d ON s."DepartmentID" = d."ID"
       WHERE s."UserId" = $1`,
      [user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ status: false, error: 'Staff not found' }, { status: 404 });
    }

    const staff = result.rows[0];
    return NextResponse.json({ 
      status: true, 
      data: {
        id: staff.ID,
        name: staff.Name,
        departmentId: staff.DepartmentID,
        departmentName: staff.departmentName,
        userId: staff.UserId
      }
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
