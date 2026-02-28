import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { status: false, error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    // Find user by email
    const userResult = await pool.query(
      `SELECT u.*, 
       ARRAY_AGG(r."Name") as roles
       FROM "AspNetUsers" u
       LEFT JOIN "AspNetUserRoles" ur ON u."Id" = ur."UserId"
       LEFT JOIN "AspNetRoles" r ON ur."RoleId" = r."Id"
       WHERE u."NormalizedEmail" = $1
       GROUP BY u."Id"`,
      [email.toUpperCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { status: false, error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    const lockoutEnabled = !!user.LockoutEnabled;
    const lockoutEndRaw = user.LockoutEnd;
    if (lockoutEnabled && lockoutEndRaw) {
      const lockoutEnd = new Date(lockoutEndRaw);
      if (!Number.isNaN(lockoutEnd.getTime()) && lockoutEnd.getTime() > Date.now()) {
        return NextResponse.json(
          { status: false, error: 'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.' },
          { status: 403 }
        );
      }
    }

    // Verify password
    if (!user.PasswordHash) {
      return NextResponse.json(
        { status: false, error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.PasswordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { status: false, error: 'Email hoặc mật khẩu không đúng' },
        { status: 401 }
      );
    }

    // Generate JWT token (roles can be null when user has no roles - ARRAY_AGG returns null)
    const roles = Array.isArray(user.roles) ? user.roles.filter((r: string) => r != null) : [];
    const token = generateToken({
      userId: user.Id,
      email: user.Email,
      roles: roles
    });

    return NextResponse.json({
      status: true,
      data: {
        token,
        user: {
          id: user.Id,
          email: user.Email ?? '',
          fullName: user.FullName ?? user.Email ?? '',
          roles
        }
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;

    const anyErr = error as any;
    const aggregateErrors: any[] = Array.isArray(anyErr?.errors) ? anyErr.errors : [];
    const isDbConnError =
      message.includes('ECONNREFUSED') ||
      message.includes('ENOTFOUND') ||
      message.includes('ETIMEDOUT') ||
      anyErr?.code === 'ECONNREFUSED' ||
      anyErr?.code === 'ENOTFOUND' ||
      anyErr?.code === 'ETIMEDOUT' ||
      aggregateErrors.some((e) => typeof e?.code === 'string' && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(e.code));

    console.error('Login error:', message, stack);

    if (isDbConnError) {
      return NextResponse.json(
        {
          status: false,
          error:
            process.env.NODE_ENV === 'development'
              ? `Database connection error: ${message}`
              : 'Không kết nối được cơ sở dữ liệu. Vui lòng kiểm tra PostgreSQL.'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        status: false,
        error: process.env.NODE_ENV === 'development' ? message : 'Đã xảy ra lỗi khi đăng nhập'
      },
      { status: 500 }
    );
  }
}

