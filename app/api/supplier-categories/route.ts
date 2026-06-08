import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { SupplierCategoryService } from '@/lib/services/supplierCategoryService';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const service = new SupplierCategoryService();
    const categories = await service.getAll();

    return NextResponse.json({
      status: true,
      data: categories
    });
  } catch (error: any) {
    console.error('Get supplier categories error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const newCategory = await service.create(data.Name);

    return NextResponse.json({
      status: true,
      data: newCategory
    });
  } catch (error: any) {
    console.error('Create supplier category error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Lỗi tạo phân loại' },
      { status: 500 }
    );
  }
}
