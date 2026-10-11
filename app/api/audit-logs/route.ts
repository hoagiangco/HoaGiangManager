import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db/index';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });
    }

    const { isSuperAdmin } = await import('@/lib/auth/permissions');
    if (!isSuperAdmin(user.roles)) {
      return NextResponse.json({ status: false, error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const action = searchParams.get('action');
    const tableName = searchParams.get('tableName');
    
    let whereClause = '1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (action) {
      whereClause += ` AND a."Action" = $${paramIndex++}`;
      values.push(action);
    }
    
    if (tableName) {
      whereClause += ` AND a."TableName" = $${paramIndex++}`;
      values.push(tableName);
    }

    const query = `
      SELECT a.*, u."FullName", u."Email" 
      FROM "AuditLogs" a
      LEFT JOIN "AspNetUsers" u ON a."UserId" = u."Id"
      WHERE ${whereClause}
      ORDER BY a."CreatedAt" DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;
    
    values.push(limit, offset);

    const countQuery = `SELECT COUNT(*) FROM "AuditLogs" a WHERE ${whereClause}`;
    const countValues = values.slice(0, values.length - 2);

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, values),
      pool.query(countQuery, countValues)
    ]);

    return NextResponse.json({
      status: true,
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count)
    });
  } catch (error: any) {
    console.error('Audit logs API error:', error);
    return NextResponse.json({ status: false, error: 'Lỗi server' }, { status: 500 });
  }
}
