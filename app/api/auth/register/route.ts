import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { generateToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { status: false, error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { status: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT "Id" FROM "AspNetUsers" WHERE "NormalizedEmail" = $1',
      [email.toUpperCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { status: false, error: 'Email đã được sử dụng' },
        { status: 400 }
      );
    }

    // Get User role
    const roleResult = await pool.query(
      'SELECT "Id" FROM "AspNetRoles" WHERE "NormalizedName" = $1',
      ['USER']
    );

    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { status: false, error: 'Role không tồn tại' },
        { status: 500 }
      );
    }

    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedEmail = email.toUpperCase();
    const normalizedUserName = email.toUpperCase();

    // Create user
    await pool.query(
      `INSERT INTO "AspNetUsers" (
        "Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail",
        "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp",
        "FullName", "CreatedDate"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        email,
        normalizedUserName,
        email,
        normalizedEmail,
        false,
        passwordHash,
        uuidv4(),
        uuidv4(),
        fullName || null,
        new Date()
      ]
    );

    // Assign User role
    await pool.query(
      'INSERT INTO "AspNetUserRoles" ("UserId", "RoleId") VALUES ($1, $2)',
      [userId, roleResult.rows[0].Id]
    );

    // Generate token
    const token = generateToken({
      userId,
      email,
      roles: ['User']
    });

    return NextResponse.json({
      status: true,
      data: {
        token,
        user: {
          id: userId,
          email,
          fullName: fullName || null,
          roles: ['User']
        }
      }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi đăng ký' },
      { status: 500 }
    );
  }
}

