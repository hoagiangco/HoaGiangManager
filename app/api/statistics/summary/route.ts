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
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    let dateFilter = '';
    const dateParams: any[] = [];
    
    if (fromDate && toDate) {
      dateParams.push(fromDate, toDate);
      dateFilter = `AND "CreatedAt" >= $1 AND "CreatedAt" <= $2`;
    }

    let deptFilterReport = '';
    let deptFilterDevice = '';
    if (departmentId && departmentId !== '0') {
      const idx = dateParams.length + 1;
      dateParams.push(departmentId);
      deptFilterReport = `AND "ReportingDepartmentId" = $${idx}`;
      deptFilterDevice = `AND "DepartmentId" = $${idx}`;
    }

    // 1. Damage Reports Summary
    const reportsQuery = `
      SELECT "Status", COUNT("ID") as count
      FROM "DamageReport"
      WHERE 1=1 ${dateFilter} ${deptFilterReport}
      GROUP BY "Status"
    `;
    const reportsRes = await pool.query(reportsQuery, dateParams);
    
    const reportStats = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0
    };
    
    reportsRes.rows.forEach(row => {
      const count = parseInt(row.count);
      reportStats.total += count;
      switch (row.Status) {
        case 1: reportStats.pending += count; break; // Pending
        case 2: // Assigned
        case 3: reportStats.inProgress += count; break; // InProgress
        case 4: reportStats.completed += count; break; // Completed
        case 5: // Cancelled
        case 6: reportStats.cancelled += count; break; // Rejected
      }
    });

    // 2. Devices Summary
    let deviceDateFilter = '';
    if (fromDate && toDate) {
      deviceDateFilter = `AND "UseDate" <= $2`; // Simplified, just an example
    }
    const devicesQuery = `
      SELECT "Status", COUNT("ID") as count
      FROM "Device"
      WHERE 1=1 ${deptFilterDevice}
      GROUP BY "Status"
    `;
    // We only use the dept filter parameter for devices, so we need to pass correct params
    const devParams = [];
    if (departmentId && departmentId !== '0') {
      devParams.push(departmentId);
    }
    const devicesRes = await pool.query(devicesQuery, devParams);

    const deviceStats = {
      total: 0,
      active: 0,
      maintenance: 0,
      broken: 0,
      liquidated: 0
    };

    devicesRes.rows.forEach(row => {
      const count = parseInt(row.count);
      deviceStats.total += count;
      switch (row.Status) {
        case 1: // DangSuDung
        case 5: deviceStats.active += count; break; // CoHuHong
        case 2: deviceStats.maintenance += count; break; // DangSuaChua
        case 3: deviceStats.broken += count; break; // HuHong
        case 4: deviceStats.liquidated += count; break; // DaThanhLy
      }
    });

    // 3. Maintenance Summary (Basic)
    const activeMaintenanceQuery = `
      SELECT COUNT("ID") as count
      FROM "Event"
      WHERE "EventTypeId" IN (
        SELECT "Id" FROM "EventType" WHERE "Category" = 'maintenance'
      ) AND "Status" != 'completed' AND "Status" != 'cancelled'
    `;
    const activeMaintRes = await pool.query(activeMaintenanceQuery);

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
