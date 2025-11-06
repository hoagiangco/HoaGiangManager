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

    // Check if user is admin
    const isAdminUser = user.roles && user.roles.includes('Admin');
    if (!isAdminUser) {
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

    // Check if user exists
    const userResult = await pool.query(
      'SELECT "Id" FROM "AspNetUsers" WHERE "Id" = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { status: false, error: 'User không tồn tại' },
        { status: 404 }
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

