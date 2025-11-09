import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DeviceService } from '@/lib/services/deviceService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, error } = await authenticate(request);

    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const id = parseInt(params.id, 10);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { status: false, error: 'Thiết bị không hợp lệ' },
        { status: 400 }
      );
    }

    const service = new DeviceService();
    const history = await service.getDamageHistory(id);

    return NextResponse.json({
      status: true,
      data: history,
    });
  } catch (err: any) {
    console.error('Get device history error:', err);
    return NextResponse.json(
      {
        status: false,
        error: err?.message || 'Đã xảy ra lỗi khi tải lịch sử thiết bị',
      },
      { status: 500 }
    );
  }
}

