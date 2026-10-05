import { maintenanceDay, maintenanceToday } from '@/lib/utils/maintenanceScheduler';
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/middleware';
import { Permission } from '@/lib/auth/permissions';
import { DeviceReminderPlanService } from '@/lib/services/deviceReminderPlanService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authorization = await requirePermission(request, Permission.MaintenanceManage);
    if (!authorization.authorized) return authorization.response;
    const { user } = authorization;

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

    if (plan.endAt && maintenanceDay(plan.endAt) < maintenanceToday()) {
      return NextResponse.json({ status: false, error: 'Cần cập nhật ngày kết thúc đã hết hạn trước khi khôi phục kế hoạch' }, { status: 400 });
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
