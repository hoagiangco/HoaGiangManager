import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { SparePartService } from '@/lib/services/sparePartService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });

    const id = parseInt(params.id);
    const { note } = await request.json();

    const sparePartService = new SparePartService();
    await sparePartService.updateTransactionNote(id, note);

    return NextResponse.json({ status: true });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}
