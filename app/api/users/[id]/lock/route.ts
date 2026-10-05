import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/middleware';
import { Permission } from '@/lib/auth/permissions';
import { UserService } from '@/lib/services/userService';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authorization = await requirePermission(request, Permission.UserManage);
    if (!authorization.authorized) return authorization.response;
    const { user } = authorization;

    const userService = new UserService();
    const targetUser = await userService.getById(params.id);

    if (targetUser?.roles?.includes('SuperAdmin')) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Không được phép khóa/mở khóa SuperAdmin' },
        { status: 403 }
      );
    }

    if (params.id === user.userId) {
      return NextResponse.json(
        { status: false, error: 'Không thể khóa hoặc mở khóa chính tài khoản của bạn' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const locked = Boolean(body?.locked);

    await userService.setLockStatus(params.id, locked);

    return NextResponse.json({
      status: true,
    });
  } catch (err: any) {
    console.error('Lock user error:', err);
    return NextResponse.json(
      { status: false, error: err?.message || 'Đã xảy ra lỗi khi cập nhật trạng thái khóa' },
      { status: 500 }
    );
  }
}











