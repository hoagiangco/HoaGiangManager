import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { SparePartService } from '@/lib/services/sparePartService';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });

    const sparePartService = new SparePartService();
    const categories = await sparePartService.getCategories();

    return NextResponse.json({ status: true, data: categories });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) return NextResponse.json({ status: false, error: 'Forbidden' }, { status: 403 });

    const data = await request.json();
    const sparePartService = new SparePartService();
    const id = await sparePartService.createCategory(data);

    return NextResponse.json({ status: true, data: { id } });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}
