import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { UserService } from '@/lib/services/userService';

export async function GET(
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

    // Only Admin can view user details
    if (!user.roles || !user.roles.includes('Admin')) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được xem thông tin người dùng' },
        { status: 403 }
      );
    }

    const userService = new UserService();
    const userData = await userService.getById(params.id);

    return NextResponse.json({
      status: userData !== null,
      data: userData
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi' },
      { status: 500 }
    );
  }
}

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

    // Only Admin can update users
    if (!user.roles || (!user.roles.includes('Admin') && !user.roles.includes('SuperAdmin'))) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được cập nhật người dùng' },
        { status: 403 }
      );
    }

    const userService = new UserService();
    const targetUser = await userService.getById(params.id);
    
    if (targetUser?.roles?.includes('SuperAdmin')) {
       // Cannot modify SuperAdmin unless you are the SuperAdmin
       if (params.id !== user.userId) {
         return NextResponse.json(
            { status: false, error: 'Forbidden: Không được phép sửa SuperAdmin' },
            { status: 403 }
         );
       }
    }
    const userData = await request.json();
    await userService.update({ ...userData, id: params.id });

    return NextResponse.json({
      status: true
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi cập nhật người dùng' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Only Admin can delete users
    if (!user.roles || (!user.roles.includes('Admin') && !user.roles.includes('SuperAdmin'))) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được xóa người dùng' },
        { status: 403 }
      );
    }

    // Cannot delete yourself
    if (params.id === user.userId) {
      return NextResponse.json(
        { status: false, error: 'Không thể xóa chính tài khoản của bạn' },
        { status: 400 }
      );
    }

    const userService = new UserService();
    const targetUser = await userService.getById(params.id);

    // No one can ever delete the SuperAdmin
    if (targetUser?.roles?.includes('SuperAdmin')) {
        return NextResponse.json(
            { status: false, error: 'Forbidden: Không được phép xóa SuperAdmin' },
            { status: 403 }
        );
    }

    const result = await userService.delete(params.id);

    return NextResponse.json({
      status: result
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi xóa người dùng' },
      { status: 500 }
    );
  }
}




