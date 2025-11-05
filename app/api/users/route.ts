import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { UserService } from '@/lib/services/userService';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only Admin can view users list
    if (!user.roles || !user.roles.includes('Admin')) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được xem danh sách người dùng' },
        { status: 403 }
      );
    }

    const userService = new UserService();
    const users = await userService.getAll();

    return NextResponse.json({
      status: true,
      data: users
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only Admin can create users
    if (!user.roles || !user.roles.includes('Admin')) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được tạo người dùng' },
        { status: 403 }
      );
    }

    const userData = await request.json();

    if (!userData.email || !userData.password) {
      return NextResponse.json(
        { status: false, error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    const userService = new UserService();
    const userId = await userService.create(userData);

    return NextResponse.json({
      status: true,
      data: { id: userId }
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi tạo người dùng' },
      { status: 500 }
    );
  }
}




