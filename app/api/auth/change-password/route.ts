import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { authenticate } from '@/lib/auth/middleware';
import { validatePassword } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request, {
      allowPasswordChangeRequired: true,
    });

    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { status: false, error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới' },
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

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { status: false, error: 'Mật khẩu mới phải khác mật khẩu hiện tại' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'SELECT "PasswordHash" FROM "AspNetUsers" WHERE "Id" = $1',
      [user.userId]
    );

    if (!result.rows[0]?.PasswordHash) {
      return NextResponse.json(
        { status: false, error: 'Không tìm thấy tài khoản' },
        { status: 404 }
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      String(currentPassword),
      result.rows[0].PasswordHash
    );

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { status: false, error: 'Mật khẩu hiện tại không đúng' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 12);
    await pool.query(
      `UPDATE "AspNetUsers"
       SET "PasswordHash" = $2,
           "MustChangePassword" = FALSE,
           "SecurityStamp" = $3,
           "AccessFailedCount" = 0
       WHERE "Id" = $1`,
      [user.userId, passwordHash, uuidv4()]
    );

    return NextResponse.json({
      status: true,
      message: 'Đổi mật khẩu thành công',
    });
  } catch (error) {
    console.error('Change own password error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi đổi mật khẩu' },
      { status: 500 }
    );
  }
}
