import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { locationService } from '@/lib/services/locationService';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });
    }
    const locations = await locationService.getAll();
    return NextResponse.json({ status: true, data: locations });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ status: false, error: 'Tên vị trí không được để trống' }, { status: 400 });
    }

    const location = await locationService.create(name);
    return NextResponse.json({ status: true, data: location });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ status: false, error: 'Tên vị trí đã tồn tại' }, { status: 409 });
    }
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
