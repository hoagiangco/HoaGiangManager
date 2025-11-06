import { NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * Health check endpoint
 * GET /api/health
 * 
 * Returns the health status of the application including:
 * - Server status
 * - Database connection status
 */
export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: false,
      error: null as string | null,
    },
  };

  try {
    // Test database connection
    const result = await pool.query('SELECT NOW() as current_time');
    if (result.rows.length > 0) {
      health.database.connected = true;
    }
  } catch (error: any) {
    health.status = 'error';
    health.database.error = error.message || 'Database connection failed';
  }

  // Return appropriate status code
  const statusCode = health.status === 'ok' && health.database.connected ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}

