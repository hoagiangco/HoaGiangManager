import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { SparePartService } from '@/lib/services/sparePartService';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });

    const sparePartService = new SparePartService();
    const item = await sparePartService.getById(parseInt(params.id));
    if (!item) return NextResponse.json({ status: false, error: 'Không tìm thấy vật tư' }, { status: 404 });

    return NextResponse.json({ status: true, data: item });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) return NextResponse.json({ status: false, error: 'Forbidden' }, { status: 403 });

    const data = await request.json();
    const sparePartService = new SparePartService();
    await sparePartService.update(parseInt(params.id), data);

    return NextResponse.json({ status: true });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) return NextResponse.json({ status: false, error: 'Forbidden' }, { status: 403 });

    const sparePartService = new SparePartService();
    await sparePartService.delete(parseInt(params.id));

    return NextResponse.json({ status: true });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}
