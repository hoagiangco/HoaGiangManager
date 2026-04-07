import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin or superadmin
    const isAdminUser = user.roles && (user.roles.includes('Admin') || user.roles.includes('SuperAdmin'));
    
    // Check if user wants to change their own password (always allowed if logged in)
    const isSelfEdit = user.userId === params.id;
    
    // Normal admins can change passwords for other users, but cannot change passwords for SuperAdmin
    if (!isAdminUser && !isSelfEdit) {
      return NextResponse.json(
        { status: false, error: 'Chỉ admin mới có quyền đổi mật khẩu' },
        { status: 403 }
      );
    }

    const { newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json(
        { status: false, error: 'Mật khẩu mới là bắt buộc' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { status: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' },
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

    if (targetRoles.includes('SuperAdmin') && !isSelfEdit) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Không được phép đổi mật khẩu SuperAdmin' },
        { status: 403 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE "AspNetUsers" SET "PasswordHash" = $1 WHERE "Id" = $2',
      [passwordHash, userId]
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

