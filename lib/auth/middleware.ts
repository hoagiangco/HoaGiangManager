import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from './jwt';
import pool from '../db';
import { hasPermission, Permission } from './permissions';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

interface AuthenticateOptions {
  allowPasswordChangeRequired?: boolean;
}

export async function authenticate(
  request: NextRequest,
  options: AuthenticateOptions = {}
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
      `SELECT u."Id", u."Email", u."NormalizedEmail", u."MustChangePassword"
       FROM "AspNetUsers" u
       WHERE u."Id" = $1`,
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      return { user: null, error: 'User not found' };
    }

    const mustChangePassword = Boolean(userResult.rows[0].MustChangePassword);
    if (mustChangePassword && !options.allowPasswordChangeRequired) {
      return { user: null, error: 'PASSWORD_CHANGE_REQUIRED' };
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
        roles,
        mustChangePassword,
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

export type PermissionCheckResult =
  | { authorized: true; user: JWTPayload }
  | { authorized: false; response: NextResponse };

/**
 * Authenticate and authorize a request in one consistent server-side guard.
 * Client-side route guards are only a UX feature and must never be the final
 * authorization boundary.
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<PermissionCheckResult> {
  const { user, error } = await authenticate(request);

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  if (!hasPermission(user.roles, permission)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { status: false, error: 'Forbidden: Insufficient permissions' },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, user };
}

