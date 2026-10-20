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

export interface AuthenticateResult {
  user: JWTPayload | null;
  error: string | null;
  statusCode?: number;
}

export async function authenticate(
  request: NextRequest,
  options: AuthenticateOptions = {}
): Promise<AuthenticateResult> {
  try {
    const authHeader = request.headers.get('authorization');
    let token: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      const { searchParams } = new URL(request.url);
      const queryToken = searchParams.get('token');
      if (queryToken) {
        token = queryToken;
      }
    }
    
    if (!token) {
      return { user: null, error: 'No token provided', statusCode: 401 };
    }
    let payload: JWTPayload;
    try {
      payload = verifyToken(token);
    } catch {
      return { user: null, error: 'Invalid token', statusCode: 401 };
    }

    // Verify user still exists, check lockout status and security stamp
    let userResult;
    try {
      userResult = await pool.query(
        `SELECT u."Id", u."Email", u."NormalizedEmail", u."MustChangePassword",
                u."LockoutEnabled", u."LockoutEnd", u."SecurityStamp"
         FROM "AspNetUsers" u
         WHERE u."Id" = $1`,
        [payload.userId]
      );
    } catch (dbErr: any) {
      console.error('Authentication database query error:', dbErr.message || dbErr);
      return {
        user: null,
        error: 'Lỗi kết nối cơ sở dữ liệu khi xác thực người dùng',
        statusCode: 503,
      };
    }

    if (userResult.rows.length === 0) {
      return { user: null, error: 'User not found', statusCode: 401 };
    }

    const userRow = userResult.rows[0];

    // Check account lockout
    if (userRow.LockoutEnabled && userRow.LockoutEnd) {
      const lockoutEnd = new Date(userRow.LockoutEnd);
      if (!Number.isNaN(lockoutEnd.getTime()) && lockoutEnd.getTime() > Date.now()) {
        return {
          user: null,
          error: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.',
          statusCode: 403,
        };
      }
    }

    // Check SecurityStamp: if token carries a securityStamp, it must match the database.
    // When password is changed/reset, SecurityStamp is regenerated, invalidating old tokens.
    if (payload.securityStamp && userRow.SecurityStamp && payload.securityStamp !== userRow.SecurityStamp) {
      return {
        user: null,
        error: 'Phiên đăng nhập đã hết hạn do mật khẩu đã thay đổi. Vui lòng đăng nhập lại.',
        statusCode: 401,
      };
    }

    const mustChangePassword = Boolean(userRow.MustChangePassword);
    if (mustChangePassword && !options.allowPasswordChangeRequired) {
      return { user: null, error: 'PASSWORD_CHANGE_REQUIRED', statusCode: 401 };
    }

    // Get user roles
    let rolesResult;
    try {
      rolesResult = await pool.query(
        `SELECT r."Name"
         FROM "AspNetRoles" r
         INNER JOIN "AspNetUserRoles" ur ON r."Id" = ur."RoleId"
         WHERE ur."UserId" = $1`,
        [payload.userId]
      );
    } catch (dbErr: any) {
      console.error('Authentication roles query error:', dbErr.message || dbErr);
      return {
        user: null,
        error: 'Lỗi kết nối cơ sở dữ liệu khi xác thực quyền người dùng',
        statusCode: 503,
      };
    }

    const roles = rolesResult.rows.map(row => row.Name);

    return {
      user: {
        userId: payload.userId,
        email: payload.email,
        roles,
        mustChangePassword,
        securityStamp: userRow.SecurityStamp || undefined,
      },
      error: null,
    };
  } catch (error: any) {
    console.error('Authentication error:', error.message || error);
    return { user: null, error: error.message || 'Invalid token', statusCode: 401 };
  }
}

export function requireAuth(
  roles?: string[]
): (request: NextRequest) => Promise<NextResponse | { user: JWTPayload }> {
  return async (request: NextRequest) => {
    const authResult = await authenticate(request);
    const { user, error, statusCode } = authResult;

    if (!user) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: statusCode || 401 }
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
  const authResult = await authenticate(request);
  const { user, error, statusCode } = authResult;

  if (!user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: statusCode || 401 }
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
