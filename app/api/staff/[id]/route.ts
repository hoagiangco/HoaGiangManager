import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { StaffService } from '@/lib/services/staffService';

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

    const id = parseInt(params.id);
    const staffService = new StaffService();
    const staff = await staffService.getById(id);

    return NextResponse.json({
      status: staff !== null,
      data: staff
    });
  } catch (error: any) {
    console.error('Get staff error:', error);
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

    const id = parseInt(params.id);
    const staffData = await request.json();
    console.log(`Updating staff ${id} with data:`, staffData);
    
    const staffService = new StaffService();
    
    // Pass all fields through; service will handle creating/linking user and updating email
    const { userId, ...updateData } = staffData;
    const before = await staffService.getById(id);
    await staffService.update({ ...updateData, id });

    const after = await staffService.getById(id);

    const createdAccount = !before?.userId && !!after?.userId;

    return NextResponse.json({
      status: true,
      message: createdAccount ? 'Cập nhật nhân viên và tạo tài khoản thành công. Mật khẩu mặc định: Staff@123' : undefined
    });
  } catch (error: any) {
    console.error('Update staff error:', error);
    return NextResponse.json(
      { 
        status: false, 
        error: error.message || 'Đã xảy ra lỗi khi cập nhật nhân viên'
      },
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

    const id = parseInt(params.id);
    console.log(`Deleting staff ${id}`);
    
    const staffService = new StaffService();
    const force = request.nextUrl.searchParams.get('force') === 'true';
    const result = await staffService.delete(id, { force });

    if (!result.success) {
      if (result.requiresConfirmation) {
        return NextResponse.json(
          {
            status: false,
            requiresConfirmation: true,
            message: result.message,
            usage: result.usage,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          status: false,
          message: result.message || 'Không thể xóa nhân viên',
        },
        { status: 400 }
      );
    }

    console.log(`Staff ${id} deleted`);

    return NextResponse.json({
      status: true,
      message: 'Xóa nhân viên thành công',
      usage: result.usage,
    });
  } catch (error: any) {
    console.error('Delete staff error:', error);
    return NextResponse.json(
      { 
        status: false, 
        error: error.message || 'Đã xảy ra lỗi khi xóa nhân viên'
      },
      { status: 500 }
    );
  }
}


