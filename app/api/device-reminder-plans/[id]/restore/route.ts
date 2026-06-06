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

    const service = new DeviceReminderPlanService();
    const plan = await service.getById(id);

    if (!plan) {
      return NextResponse.json(
        { status: false, error: 'Không tìm thấy kế hoạch' },
        { status: 404 }
      );
    }

    if (plan.isActive) {
      return NextResponse.json(
        { status: false, error: 'Kế hoạch này đang hoạt động, không cần khôi phục' },
        { status: 400 }
      );
    }

    // Log restore history into metadata
    const metadata = plan.metadata || {};
    const restoreHistory = metadata.restoreHistory || [];
    restoreHistory.push({
      restoredBy: (user as any).email || 'unknown',
      restoredAt: new Date().toISOString(),
    });

    const updatedPlan: any = {
      ...plan,
      isActive: true,
      metadata: {
        ...metadata,
        restoreHistory,
      },
      updatedBy: (user as any).email || null,
      updatedAt: new Date(),
    };

    await service.update(updatedPlan);

    return NextResponse.json({
      status: true,
      data: {
        id: plan.id,
        message: 'Đã khôi phục kế hoạch thành công',
      },
    });
  } catch (error: any) {
    console.error('Restore reminder plan error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi khôi phục kế hoạch',
      },
      { status: 500 }
    );
  }
}
