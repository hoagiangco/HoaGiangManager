import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DeviceReminderPlanService } from '@/lib/services/deviceReminderPlanService';

const parseDate = (value: any): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

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
    const { newDate, reason } = body;

    if (!newDate) {
      return NextResponse.json(
        { status: false, error: 'Ngày mới là bắt buộc' },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { status: false, error: 'Lý do dời lịch là bắt buộc' },
        { status: 400 }
      );
    }

    const newDateObj = parseDate(newDate);
    if (!newDateObj) {
      return NextResponse.json(
        { status: false, error: 'Ngày mới không hợp lệ' },
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

    // Update metadata with reschedule history
    const metadata = plan.metadata || {};
    const rescheduleHistory = metadata.rescheduleHistory || [];
    
    rescheduleHistory.push({
      fromDate: plan.nextDueDate ? new Date(plan.nextDueDate).toISOString().split('T')[0] : null,
      toDate: newDateObj.toISOString().split('T')[0],
      reason: reason.trim(),
      rescheduledBy: (user as any).email || 'unknown',
      rescheduledAt: new Date().toISOString(),
    });

    const updatedPlan: any = {
      ...plan,
      nextDueDate: newDateObj,
      metadata: {
        ...metadata,
        rescheduleHistory,
      },
      updatedBy: (user as any).email || null,
      updatedAt: new Date(),
    };

    await service.update(updatedPlan);

    return NextResponse.json({
      status: true,
      data: {
        id: plan.id,
        nextDueDate: newDateObj.toISOString().split('T')[0],
        message: 'Đã dời lịch thành công',
      },
    });
  } catch (error: any) {
    console.error('Reschedule reminder plan error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi dời lịch',
      },
      { status: 500 }
    );
  }
}

