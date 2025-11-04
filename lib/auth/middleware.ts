import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from './jwt';
import pool from '../db';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export async function authenticate(
  request: NextRequest
): Promise<{ user: JWTPayload | null; error: string | null }> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null, error: 'No token provided' };
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    // Verify user still exists and get roles
    const userResult = await pool.query(
      `SELECT u."Id", u."Email", u."NormalizedEmail"
       FROM "AspNetUsers" u
       WHERE u."Id" = $1`,
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      return { user: null, error: 'User not found' };
    }

    // Get user roles
    const rolesResult = await pool.query(
      `SELECT r."Name"
       FROM "AspNetRoles" r
       INNER JOIN "AspNetUserRoles" ur ON r."Id" = ur."RoleId"
       WHERE ur."UserId" = $1`,
      [payload.userId]
    );

    const roles = rolesResult.rows.map(row => row.Name);

    return {
      user: {
        userId: payload.userId,
        email: payload.email,
        roles
      },
      error: null
    };
  } catch (error: any) {
    console.error('Authentication error:', error.message || error);
    return { user: null, error: error.message || 'Invalid token' };
  }
}

export function requireAuth(
  roles?: string[]
): (request: NextRequest) => Promise<NextResponse | { user: JWTPayload }> {
  return async (request: NextRequest) => {
    const { user, error } = await authenticate(request);

    if (!user) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    if (roles && roles.length > 0) {
      const hasRole = roles.some(role => user.roles.includes(role));
      if (!hasRole) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    return { user };
  };
}

