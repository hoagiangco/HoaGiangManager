import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, email, newPassword } = await request.json();

    if (!token || !email || !newPassword) {
      return NextResponse.json({ status: false, error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { status: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' },
        { status: 400 }
      );
    }

    // Get SuperAdmin User ID
    const userResult = await pool.query(
      'SELECT "Id" FROM "AspNetUsers" WHERE "NormalizedEmail" = $1',
      [email.toUpperCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ status: false, error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    const userId = userResult.rows[0].Id;

    // Verify Token
    const tokenResult = await pool.query(
      `SELECT "Value" FROM "AspNetUserTokens" WHERE "UserId" = $1 AND "LoginProvider" = $2 AND "Name" = $3`,
      [userId, 'HoaGiangManager', 'ResetPassword']
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json({ status: false, error: 'Token không hợp lệ hoặc đã hết hạn.' }, { status: 400 });
    }

    const storedTokenData = JSON.parse(tokenResult.rows[0].Value);

    // Validate rawToken and EXP
    if (storedTokenData.token !== token) {
      return NextResponse.json({ status: false, error: 'Token không khớp.' }, { status: 400 });
    }

    if (Date.now() > storedTokenData.exp) {
       // Token Expired
       return NextResponse.json({ status: false, error: 'Token đã hết hạn. Vui lòng yêu cầu lại.' }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      `UPDATE "AspNetUsers" SET "PasswordHash" = $1 WHERE "Id" = $2`,
      [passwordHash, userId]
    );

    // Delete token after successful usage
    await pool.query(
      `DELETE FROM "AspNetUserTokens" WHERE "UserId" = $1 AND "LoginProvider" = $2 AND "Name" = $3`,
      [userId, 'HoaGiangManager', 'ResetPassword']
    );

    return NextResponse.json({
      status: true,
      message: 'Đặt lại mật khẩu thành công.'
    });

  } catch (error: any) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { status: false, error: 'Lỗi khi đặt lại mật khẩu: ' + (error.message || 'Đã xảy ra lỗi') },
      { status: 500 }
    );
  }
}
