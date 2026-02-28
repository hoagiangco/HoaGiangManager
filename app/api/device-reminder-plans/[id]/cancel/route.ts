import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DeviceReminderPlanService } from '@/lib/services/deviceReminderPlanService';

export async function POST(
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

    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { status: false, error: 'ID không hợp lệ' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { status: false, error: 'Lý do hủy là bắt buộc' },
        { status: 400 }
      );
    }

    const service = new DeviceReminderPlanService();
    const plan = await service.getById(id);

    if (!plan) {
      return NextResponse.json(
        { status: false, error: 'Không tìm thấy kế hoạch' },
        { status: 404 }
      );
    }

    // Update metadata with cancel history
    const metadata = plan.metadata || {};
    const cancelHistory = metadata.cancelHistory || [];
    
    cancelHistory.push({
      cancelReason: reason.trim(),
      cancelledBy: (user as any).email || 'unknown',
      cancelledAt: new Date().toISOString(),
    });

    const updatedPlan: any = {
      ...plan,
      isActive: false,
      metadata: {
        ...metadata,
        cancelHistory,
      },
      updatedBy: (user as any).email || null,
      updatedAt: new Date(),
    };

    await service.update(updatedPlan);

    return NextResponse.json({
      status: true,
      data: {
        id: plan.id,
        message: 'Đã hủy kế hoạch thành công',
      },
    });
  } catch (error: any) {
    console.error('Cancel reminder plan error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi hủy kế hoạch',
      },
      { status: 500 }
    );
  }
}

