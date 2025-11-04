import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DepartmentService } from '@/lib/services/departmentService';

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
    const departmentService = new DepartmentService();
    const department = await departmentService.getById(id);

    return NextResponse.json({
      status: department !== null,
      data: department
    });
  } catch (error: any) {
    console.error('Get department error:', error);
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
    const departmentData = await request.json();
    const departmentService = new DepartmentService();
    
    await departmentService.update({ ...departmentData, id });

    return NextResponse.json({
      status: true
    });
  } catch (error: any) {
    console.error('Update department error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi cập nhật phòng ban' },
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
    const departmentService = new DepartmentService();
    const result = await departmentService.delete(id);

    return NextResponse.json({
      status: result
    });
  } catch (error: any) {
    console.error('Delete department error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi xóa phòng ban' },
      { status: 500 }
    );
  }
}

