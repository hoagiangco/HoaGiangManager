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
    const id = parseInt(params.id);
    const sparePartService = new SparePartService();
    
    const oldItem = await sparePartService.getById(id);
    await sparePartService.update(id, data);
    const newItem = await sparePartService.getById(id);

    try {
      const { logAudit } = await import('@/lib/services/auditService');
      await logAudit(null, user.userId, 'UPDATE', 'SparePart', id.toString(), oldItem, newItem, request.headers.get('x-forwarded-for') || request.ip);
    } catch (auditError) {
      console.error('Audit log failed for spare part update:', auditError);
    }

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

    const id = parseInt(params.id);
    const sparePartService = new SparePartService();
    const oldItem = await sparePartService.getById(id);
    
    await sparePartService.delete(id);

    try {
      const { logAudit } = await import('@/lib/services/auditService');
      await logAudit(null, user.userId, 'DELETE', 'SparePart', id.toString(), oldItem, null, request.headers.get('x-forwarded-for') || request.ip);
    } catch (auditError) {
      console.error('Audit log failed for spare part delete:', auditError);
    }

    return NextResponse.json({ status: true });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}
