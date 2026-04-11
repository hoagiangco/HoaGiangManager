import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { locationService } from '@/lib/services/locationService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });
    }
    const id = parseInt(params.id);
    const location = await locationService.getById(id);
    return NextResponse.json({ status: location !== null, data: location });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: 'Đã xảy ra lỗi' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });
    }
    const id = parseInt(params.id);
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ status: false, error: 'Tên vị trí không được để trống' }, { status: 400 });
    }

    const updated = await locationService.update(id, name);
    return NextResponse.json({ status: updated !== null, data: updated });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ status: false, error: 'Tên vị trí đã tồn tại' }, { status: 409 });
    }
    return NextResponse.json({ status: false, error: 'Đã xảy ra lỗi khi cập nhật vị trí' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });
    }
    const id = parseInt(params.id);
    const result = await locationService.delete(id);
    return NextResponse.json({ status: result.success, error: result.message });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: 'Đã xảy ra lỗi khi xóa vị trí' }, { status: 500 });
  }
}
