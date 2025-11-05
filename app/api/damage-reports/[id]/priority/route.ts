import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';
import { DamageReportPriority } from '@/types';

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
    const { priority } = await request.json();

    if (!priority || ![1, 2, 3, 4].includes(priority)) {
      return NextResponse.json(
        { status: false, error: 'Ưu tiên không hợp lệ' },
        { status: 400 }
      );
    }

    const damageReportService = new DamageReportService();
    await damageReportService.updatePriority(id, priority as DamageReportPriority, user.userId);

    return NextResponse.json({
      status: true
    });
  } catch (error: any) {
    console.error('Update priority error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi cập nhật ưu tiên' },
      { status: 500 }
    );
  }
}




