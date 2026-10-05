import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/middleware';
import { Permission } from '@/lib/auth/permissions';
import { UserService } from '@/lib/services/userService';
import { validatePassword } from '@/lib/auth/password';

export async function GET(request: NextRequest) {
  try {
    const authorization = await requirePermission(request, Permission.UserManage);
    if (!authorization.authorized) return authorization.response;

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
    const authorization = await requirePermission(request, Permission.UserManage);
    if (!authorization.authorized) return authorization.response;
    const { user } = authorization;

    const userData = await request.json();

    if (!userData.email || !userData.password) {
      return NextResponse.json(
        { status: false, error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(String(userData.password));
    if (passwordError) {
      return NextResponse.json(
        { status: false, error: passwordError },
        { status: 400 }
      );
    }

    if (userData.roles && userData.roles.length > 1) {
      return NextResponse.json(
        { status: false, error: 'Mỗi người dùng chỉ được gán tối đa 1 vai trò (Single-Role)' },
        { status: 400 }
      );
    }

    // Check if trying to create a SuperAdmin
    if (userData.roles?.includes('SuperAdmin')) {
      const isRequesterSuperAdmin = user.roles && user.roles.includes('SuperAdmin');
      if (!isRequesterSuperAdmin) {
        return NextResponse.json(
          { status: false, error: 'Forbidden: Chỉ SuperAdmin mới có quyền tạo user SuperAdmin' },
          { status: 403 }
        );
      }
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




