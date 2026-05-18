import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { SparePartService } from '@/lib/services/sparePartService';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) return NextResponse.json({ status: false, error: 'Forbidden' }, { status: 403 });

    const id = parseInt(params.id);
    const data = await request.json();
    const sparePartService = new SparePartService();
    
    await sparePartService.updateCategory(id, data);

    return NextResponse.json({ status: true });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) return NextResponse.json({ status: false, error: 'Forbidden' }, { status: 403 });

    const id = parseInt(params.id);
    const sparePartService = new SparePartService();
    
    await sparePartService.deleteCategory(id);

    return NextResponse.json({ status: true });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}
