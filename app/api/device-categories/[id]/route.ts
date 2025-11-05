import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DeviceCategoryService } from '@/lib/services/deviceCategoryService';

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
    const categoryService = new DeviceCategoryService();
    const category = await categoryService.getById(id);

    return NextResponse.json({
      status: category !== null,
      data: category
    });
  } catch (error: any) {
    console.error('Get device category error:', error);
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
    const categoryData = await request.json();
    const categoryService = new DeviceCategoryService();
    await categoryService.update({ ...categoryData, id });

    return NextResponse.json({
      status: true
    });
  } catch (error: any) {
    console.error('Update device category error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi cập nhật danh mục thiết bị' },
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
    const categoryService = new DeviceCategoryService();
    const result = await categoryService.delete(id);

    return NextResponse.json({
      status: result,
      message: result ? 'Xóa thành công' : 'Không thể xóa danh mục đang được sử dụng trong thiết bị'
    });
  } catch (error: any) {
    console.error('Delete device category error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi xóa danh mục thiết bị' },
      { status: 500 }
    );
  }
}




