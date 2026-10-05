import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/middleware';
import { Permission } from '@/lib/auth/permissions';
import { validatePassword } from '@/lib/auth/password';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authorization = await requirePermission(request, Permission.UserManage);
    if (!authorization.authorized) return authorization.response;
    const { user } = authorization;

    const { newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json(
        { status: false, error: 'Mật khẩu mới là bắt buộc' },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(String(newPassword));
    if (passwordError) {
      return NextResponse.json(
        { status: false, error: passwordError },
        { status: 400 }
      );
    }

    const userId = params.id;

    // Check if user exists and get their roles
    const userResult = await pool.query(`
      SELECT u."Id", ARRAY_AGG(r."Name") as roles 
      FROM "AspNetUsers" u
      LEFT JOIN "AspNetUserRoles" ur ON u."Id" = ur."UserId"
      LEFT JOIN "AspNetRoles" r ON ur."RoleId" = r."Id"
      WHERE u."Id" = $1
      GROUP BY u."Id"
    `, [userId]);

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { status: false, error: 'User không tồn tại' },
        { status: 404 }
      );
    }

    const targetRoles = userResult.rows[0].roles || [];

    if (targetRoles.includes('SuperAdmin') && user.userId !== userId) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Không được phép đổi mật khẩu SuperAdmin' },
        { status: 403 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await pool.query(
      `UPDATE "AspNetUsers"
       SET "PasswordHash" = $1,
           "MustChangePassword" = FALSE,
           "AccessFailedCount" = 0,
           "SecurityStamp" = $3
       WHERE "Id" = $2`,
      [passwordHash, userId, uuidv4()]
    );

    return NextResponse.json({
      status: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { status: false, error: 'Lỗi khi đổi mật khẩu: ' + (error.message || 'Đã xảy ra lỗi') },
      { status: 500 }
    );
  }
}

