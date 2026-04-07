import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ status: false, error: 'Email là bắt buộc' }, { status: 400 });
    }



    // Get SuperAdmin User ID
    const userResult = await pool.query(
      'SELECT u."Id", ARRAY_AGG(r."Name") as roles FROM "AspNetUsers" u LEFT JOIN "AspNetUserRoles" ur ON u."Id" = ur."UserId" LEFT JOIN "AspNetRoles" r ON ur."RoleId" = r."Id" WHERE u."NormalizedEmail" = $1 GROUP BY u."Id"',
      [email.toUpperCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ status: false, error: 'Tài khoản không tồn tại trong hệ thống.' }, { status: 404 });
    }

    const userId = userResult.rows[0].Id;
    const roles = userResult.rows[0].roles || [];

    if (!roles.includes('SuperAdmin')) {
      return NextResponse.json(
        { status: false, error: 'Bạn không có quyền thực hiện chức năng này. Vui lòng liên hệ Quản trị viên!' },
        { status: 403 }
      );
    }

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenExp = Date.now() + 3600000; // 1 hour expiration
    const tokenValue = JSON.stringify({ token: rawToken, exp: tokenExp });

    // Store token in AspNetUserTokens table
    await pool.query(
      `INSERT INTO "AspNetUserTokens" ("UserId", "LoginProvider", "Name", "Value") 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT ("UserId", "LoginProvider", "Name") 
       DO UPDATE SET "Value" = EXCLUDED."Value"`,
      [userId, 'HoaGiangManager', 'ResetPassword', tokenValue]
    );

    // Setup nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    const mailOptions = {
      from: `"HoaGiang Manager" <${process.env.SMTP_USER || 'noreply@hoagiang.com'}>`, // sender address
      to: email, 
      subject: 'Yêu cầu khôi phục mật khẩu - HoaGiang Manager',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0d6efd; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Khôi Phục Mật Khẩu</h2>
          </div>
          <div style="padding: 20px; color: #333; line-height: 1.6;">
            <p>Chào bạn,</p>
            <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản <strong>SuperAdmin</strong> (${email}).</p>
            <p>Vui lòng nhấn vào nút bên dưới để thiết lập lại mật khẩu của bạn. Liên kết này có hiệu lực trong vòng 1 giờ.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #0d6efd; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Thiết Lập Lại Mật Khẩu
              </a>
            </div>
            <p style="font-size: 14px; color: #666;">
              Hoặc copy liên kết sau vào trình duyệt:<br/>
              <span style="word-break: break-all; color: #0d6efd;">${resetLink}</span>
            </p>
            <p>Nếu bạn không yêu cầu điều này, xin vui lòng bỏ qua email này hoặc liên hệ với bộ phận hỗ trợ nếu cảm thấy có dấu hiệu bất thường.</p>
          </div>
          <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            &copy; ${new Date().getFullYear()} HoaGiang Manager. Bản quyền thuộc về LeeKhiem.
          </div>
        </div>
      `,
    };

    // We do NOT stop error if email is not configured but just log it and send fake success to user for dev purposes
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
       console.warn("MOCK SMTP: ", process.env.SMTP_USER);
       console.log("Mock email sent. Reset link:", resetLink);
    } else {
       await transporter.sendMail(mailOptions);
    }

    return NextResponse.json({
      status: true,
      message: 'Email hướng dẫn khôi phục mật khẩu đã được gửi đến hộp thư của bạn.'
    });

  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { status: false, error: 'Lỗi khi gửi email: ' + (error.message || 'Đã xảy ra lỗi') },
      { status: 500 }
    );
  }
}
