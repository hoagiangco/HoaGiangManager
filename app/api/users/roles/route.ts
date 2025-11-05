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

    // Only Admin can view roles
    if (!user.roles || !user.roles.includes('Admin')) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được xem danh sách vai trò' },
        { status: 403 }
      );
    }

    const userService = new UserService();
    const roles = await userService.getAllRoles();

    return NextResponse.json({
      status: true,
      data: roles
    });
  } catch (error: any) {
    console.error('Get roles error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi' },
      { status: 500 }
    );
  }
}




