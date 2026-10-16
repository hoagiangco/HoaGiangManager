import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import bcrypt from 'bcryptjs';
import { validatePassword } from '@/lib/auth/password';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const { token, email, newPassword } = await request.json();

    if (!token || !email || !newPassword) {
      return NextResponse.json({ status: false, error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const passwordError = validatePassword(String(newPassword));
    if (passwordError) {
      return NextResponse.json(
        { status: false, error: passwordError },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Get User ID and lock user row
    const userResult = await client.query(
      'SELECT "Id" FROM "AspNetUsers" WHERE "NormalizedEmail" = $1 FOR UPDATE',
      [email.toUpperCase()]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ status: false, error: 'Người dùng không tồn tại' }, { status: 404 });
    }

    const userId = userResult.rows[0].Id;

    // Atomically consume the token: DELETE and RETURN the token value in one operation.
    // If concurrent requests hit simultaneously, only one gets the row.
    const tokenResult = await client.query(
      `DELETE FROM "AspNetUserTokens"
       WHERE "UserId" = $1 AND "LoginProvider" = $2 AND "Name" = $3
       RETURNING "Value"`,
      [userId, 'HoaGiangManager', 'ResetPassword']
    );

    if (tokenResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ status: false, error: 'Token không hợp lệ hoặc đã được sử dụng.' }, { status: 400 });
    }

    let storedTokenData: { token: string; exp: number };
    try {
      storedTokenData = JSON.parse(tokenResult.rows[0].Value);
    } catch {
      await client.query('ROLLBACK');
      return NextResponse.json({ status: false, error: 'Dữ liệu token không hợp lệ.' }, { status: 400 });
    }

    // Validate rawToken and EXP
    if (storedTokenData.token !== token) {
      await client.query('ROLLBACK');
      return NextResponse.json({ status: false, error: 'Token không khớp.' }, { status: 400 });
    }

    if (Date.now() > storedTokenData.exp) {
      await client.query('ROLLBACK');
      return NextResponse.json({ status: false, error: 'Token đã hết hạn. Vui lòng yêu cầu lại.' }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and regenerate SecurityStamp to immediately revoke all existing sessions
    await client.query(
      `UPDATE "AspNetUsers"
       SET "PasswordHash" = $1,
           "MustChangePassword" = FALSE,
           "AccessFailedCount" = 0,
           "SecurityStamp" = $3
       WHERE "Id" = $2`,
      [passwordHash, userId, uuidv4()]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      status: true,
      message: 'Đặt lại mật khẩu thành công.'
    });

  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Reset password error:', error);
    return NextResponse.json(
      { status: false, error: 'Lỗi khi đặt lại mật khẩu: ' + (error.message || 'Đã xảy ra lỗi') },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
