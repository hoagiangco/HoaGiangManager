import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { SupplierCategoryService } from '@/lib/services/supplierCategoryService';

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

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) {
      return NextResponse.json(
        { status: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const data = await request.json();
    if (!data.Name) {
      return NextResponse.json({ status: false, error: 'Tên phân loại không được để trống' }, { status: 400 });
    }

    const service = new SupplierCategoryService();
    const updated = await service.update(parseInt(params.id), data.Name);

    return NextResponse.json({
      status: true,
      data: updated
    });
  } catch (error: any) {
    console.error('Update supplier category error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Lỗi cập nhật phân loại' },
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

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) {
      return NextResponse.json(
        { status: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const service = new SupplierCategoryService();
    const success = await service.delete(parseInt(params.id));

    return NextResponse.json({
      status: success,
      message: success ? 'Xóa thành công' : 'Xóa thất bại'
    });
  } catch (error: any) {
    console.error('Delete supplier category error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Lỗi xóa phân loại' },
      { status: 500 }
    );
  }
}
