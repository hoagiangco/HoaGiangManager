import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';
import { DamageReportStatus } from '@/types';

export async function PUT(
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

    const id = parseInt(params.id);
    const { status } = await request.json();

    if (!status || ![1, 2, 3, 4, 5, 6].includes(status)) {
      return NextResponse.json(
        { status: false, error: 'Trạng thái không hợp lệ' },
        { status: 400 }
      );
    }

    const damageReportService = new DamageReportService();
    await damageReportService.updateStatus(id, status as DamageReportStatus, user.userId);

    return NextResponse.json({
      status: true
    });
  } catch (error: any) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi cập nhật trạng thái' },
      { status: 500 }
    );
  }
}




