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

    // Generate JWT token
    const roles = user.roles.filter((r: string) => r !== null);
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
          email: user.Email,
          fullName: user.FullName,
          roles: roles
        }
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi đăng nhập' },
      { status: 500 }
    );
  }
}

