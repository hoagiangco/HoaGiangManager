import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { SparePartService } from '@/lib/services/sparePartService';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = parseInt(searchParams.get('categoryId') || '0');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const sparePartService = new SparePartService();
    const result = await sparePartService.getPaginated({ page, limit, categoryId, search });

    return NextResponse.json({
      status: true,
      data: result.items,
      total: result.total
    });
  } catch (error: any) {
    console.error('Get spare parts error:', error);
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });
    }

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) {
      return NextResponse.json({ status: false, error: 'Forbidden' }, { status: 403 });
    }

    const data = await request.json();
    const sparePartService = new SparePartService();
    const id = await sparePartService.create(data);

    return NextResponse.json({ status: true, data: { id } });
  } catch (error: any) {
    console.error('Create spare part error:', error);
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}
