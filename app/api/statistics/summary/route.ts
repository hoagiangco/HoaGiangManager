import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';

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
    const departmentId = searchParams.get('departmentId');
    const locationId = searchParams.get('locationId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // 1. Damage Reports Summary
    const reportsParams: any[] = [];
    let reportsFilter = '';
    
    if (fromDate && toDate) {
      reportsParams.push(fromDate, toDate);
      reportsFilter += ` AND "ReportDate" >= $1 AND "ReportDate" <= $2`;
    }

    if (departmentId && departmentId !== '0') {
      reportsParams.push(departmentId);
      reportsFilter += ` AND "ReportingDepartmentID" = $${reportsParams.length}`;
    }

    if (locationId && locationId !== '0') {
      reportsParams.push(locationId);
      reportsFilter += ` AND "DeviceID" IN (SELECT "ID" FROM "Device" WHERE "LocationID" = $${reportsParams.length})`;
    }

    const reportsQuery = `
      SELECT "Status", COUNT("ID") as count
      FROM "DamageReport"
      WHERE 1=1 ${reportsFilter}
      GROUP BY "Status"
    `;
    const reportsRes = await pool.query(reportsQuery, reportsParams);
    
    const reportStats = {
      total: 0,
      pending: 0,
      assigned: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0
    };
    
    reportsRes.rows.forEach(row => {
      const count = parseInt(row.count);
      reportStats.total += count;
      const status = Number(row.Status);
      switch (status) {
        case 1: reportStats.pending += count; break; // Pending
        case 2: reportStats.assigned += count; break; // Assigned
        case 3: reportStats.inProgress += count; break; // InProgress
        case 4: reportStats.completed += count; break; // Completed
        case 5: reportStats.cancelled += count; break; // Cancelled
        case 6: reportStats.rejected += count; break; // Rejected
      }
    });

    // 2. Devices Summary
    const devicesParams: any[] = [];
    let devicesFilter = '';
    
    if (departmentId && departmentId !== '0') {
      devicesParams.push(departmentId);
      devicesFilter += ` AND "DepartmentID" = $${devicesParams.length}`;
    }

    if (locationId && locationId !== '0') {
      devicesParams.push(locationId);
      devicesFilter += ` AND "LocationID" = $${devicesParams.length}`;
    }

    const devicesQuery = `
      SELECT "Status", COUNT("ID") as count
      FROM "Device"
      WHERE 1=1 ${devicesFilter}
      GROUP BY "Status"
    `;
    const devicesRes = await pool.query(devicesQuery, devicesParams);

    const deviceStats = {
      total: 0,
      dangSuDung: 0,
      dangSuaChua: 0,
      huHong: 0,
      daThanhLy: 0,
      coHuHong: 0
    };

    devicesRes.rows.forEach(row => {
      const count = parseInt(row.count);
      deviceStats.total += count;
      const status = Number(row.Status);
      switch (status) {
        case 1: deviceStats.dangSuDung += count; break; // DangSuDung
        case 2: deviceStats.dangSuaChua += count; break; // DangSuaChua
        case 3: deviceStats.huHong += count; break; // HuHong
        case 4: deviceStats.daThanhLy += count; break; // DaThanhLy
        case 5: deviceStats.coHuHong += count; break; // CoHuHong
      }
    });

    // 3. Maintenance Summary (Basic)
    const maintParams: any[] = [];
    let maintFilter = '';
    
    if (departmentId && departmentId !== '0') {
      maintParams.push(departmentId);
      maintFilter += ` AND d."DepartmentID" = $${maintParams.length}`;
    }
    
    if (locationId && locationId !== '0') {
      maintParams.push(locationId);
      maintFilter += ` AND d."LocationID" = $${maintParams.length}`;
    }

    const activeMaintenanceQuery = `
      SELECT COUNT(e."ID") as count
      FROM "Event" e
      LEFT JOIN "Device" d ON e."DeviceID" = d."ID"
      WHERE e."EventTypeID" IN (
        SELECT "ID" FROM "EventType" WHERE "Category" = 'maintenance'
      ) AND e."Status" != 'completed' AND e."Status" != 'cancelled'
      ${maintFilter}
    `;
    const activeMaintRes = await pool.query(activeMaintenanceQuery, maintParams);

    return NextResponse.json({
      status: true,
      data: {
        reports: reportStats,
        devices: deviceStats,
        activeMaintenance: parseInt(activeMaintRes.rows[0]?.count || '0')
      }
    });
  } catch (error: any) {
    console.error('Statistics API Error:', error);
    return NextResponse.json(
      { status: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
