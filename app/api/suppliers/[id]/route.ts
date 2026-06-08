import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { SupplierService } from '@/lib/services/supplierService';

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

    const supplierService = new SupplierService();
    const supplier = await supplierService.getById(parseInt(params.id));

    if (!supplier) {
      return NextResponse.json(
        { status: false, error: 'Không tìm thấy nhà cung cấp' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: true,
      data: supplier
    });
  } catch (error: any) {
    console.error('Get supplier details error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi' },
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

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được thao tác' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const supplierService = new SupplierService();
    const success = await supplierService.update(parseInt(params.id), data);

    return NextResponse.json({
      status: success,
      message: success ? 'Cập nhật thành công' : 'Cập nhật thất bại'
    });
  } catch (error: any) {
    console.error('Update supplier error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi cập nhật' },
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
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được thao tác' },
        { status: 403 }
      );
    }

    const supplierService = new SupplierService();
    const success = await supplierService.delete(parseInt(params.id));

    return NextResponse.json({
      status: success,
      message: success ? 'Xóa thành công' : 'Xóa thất bại'
    });
  } catch (error: any) {
    console.error('Delete supplier error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi xóa' },
      { status: 500 }
    );
  }
}
