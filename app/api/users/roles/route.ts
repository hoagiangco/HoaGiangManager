import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/middleware';
import { Permission } from '@/lib/auth/permissions';
import { UserService } from '@/lib/services/userService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authorization = await requirePermission(request, Permission.UserManage);
    if (!authorization.authorized) return authorization.response;

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




