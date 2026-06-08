import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { SupplierService } from '@/lib/services/supplierService';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const search = searchParams.get('search') || '';
    const categoryId = parseInt(searchParams.get('categoryId') || '0');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const supplierService = new SupplierService();
    const result = await supplierService.getPaginated({
      page,
      limit,
      search,
      categoryId
    });

    return NextResponse.json({
      status: true,
      data: result.suppliers,
      total: result.total
    });
  } catch (error: any) {
    console.error('Get suppliers error:', error);
    return NextResponse.json(
      { 
        status: false, 
        error: error.message || 'Đã xảy ra lỗi'
      },
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
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được thao tác' },
        { status: 403 }
      );
    }

    const data = await request.json();
    
    const supplierService = new SupplierService();
    const id = await supplierService.create(data);

    return NextResponse.json({
      status: id > 0,
      data: { id }
    });
  } catch (error: any) {
    console.error('Create supplier error:', error);
    return NextResponse.json(
      { 
        status: false, 
        error: error.message || 'Đã xảy ra lỗi khi tạo nhà cung cấp'
      },
      { status: 500 }
    );
  }
}
