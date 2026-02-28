import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { UserService } from '@/lib/services/userService';

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

    if (!user.roles || !user.roles.includes('Admin')) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được khóa/mở khóa người dùng' },
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

    const userService = new UserService();
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











