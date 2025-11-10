import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DeviceReminderPlanService } from '@/lib/services/deviceReminderPlanService';
import { DeviceReminderPlan, EventCategory } from '@/types';

type IntervalUnit = 'day' | 'week' | 'month' | 'year';

const intervalUnitSet = new Set<IntervalUnit>(['day', 'week', 'month', 'year']);
const reminderTypeSet = new Set<EventCategory | 'custom'>([
  'lifecycle',
  'maintenance',
  'warranty',
  'movement',
  'inspection',
  'other',
  'custom',
]);

const parseDate = (value: any): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseMetadata = (value: any): Record<string, any> | null => {
  if (!value) return null;
  if (typeof value === 'object') {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    return JSON.parse(value);
  }
  return null;
};

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceIdParam = searchParams.get('deviceId');
    const deviceId = deviceIdParam ? Number(deviceIdParam) : undefined;

    if (deviceIdParam && (Number.isNaN(deviceId) || deviceId! < 0)) {
      return NextResponse.json(
        { status: false, error: 'deviceId không hợp lệ' },
        { status: 400 }
      );
    }

    const service = new DeviceReminderPlanService();
    const plans = await service.list(deviceId);

    return NextResponse.json({ status: true, data: plans });
  } catch (error: any) {
    console.error('Get reminder plans error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi tải kế hoạch nhắc nhở' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await request.json();
    if (!payload || typeof payload !== 'object') {
      return NextResponse.json(
        { status: false, error: 'Dữ liệu kế hoạch không hợp lệ' },
        { status: 400 }
      );
    }

    const deviceId = Number(payload.deviceId);
    if (!deviceId || Number.isNaN(deviceId)) {
      return NextResponse.json(
        { status: false, error: 'Vui lòng chọn thiết bị' },
        { status: 400 }
      );
    }

    const reminderTypeRaw = String(payload.reminderType || '').trim().toLowerCase();
    if (!reminderTypeRaw) {
      return NextResponse.json(
        { status: false, error: 'Vui lòng chọn loại nhắc nhở' },
        { status: 400 }
      );
    }

    if (!reminderTypeSet.has(reminderTypeRaw as EventCategory | 'custom')) {
      return NextResponse.json(
        { status: false, error: 'Loại nhắc nhở không hợp lệ' },
        { status: 400 }
      );
    }
    const reminderType = reminderTypeRaw as EventCategory | 'custom';

    const eventTypeId = payload.eventTypeId ? Number(payload.eventTypeId) : null;
    if (payload.eventTypeId && Number.isNaN(eventTypeId)) {
      return NextResponse.json(
        { status: false, error: 'eventTypeId không hợp lệ' },
        { status: 400 }
      );
    }

    const intervalValue = payload.intervalValue ? Number(payload.intervalValue) : null;
    const intervalUnitRaw = payload.intervalUnit ? String(payload.intervalUnit).toLowerCase() : null;
    const cronExpression = payload.cronExpression ? String(payload.cronExpression).trim() : null;

    if (intervalValue !== null && (Number.isNaN(intervalValue) || intervalValue <= 0)) {
      return NextResponse.json(
        { status: false, error: 'Giá trị chu kỳ phải lớn hơn 0' },
        { status: 400 }
      );
    }

    if (intervalUnitRaw && !intervalUnitSet.has(intervalUnitRaw as IntervalUnit)) {
      return NextResponse.json(
        { status: false, error: 'Đơn vị chu kỳ không hợp lệ' },
        { status: 400 }
      );
    }

    if (!intervalValue && !cronExpression) {
      return NextResponse.json(
        { status: false, error: 'Hãy nhập chu kỳ (interval) hoặc biểu thức Cron' },
        { status: 400 }
      );
    }

    let metadata: Record<string, any> | null = null;
    try {
      metadata = parseMetadata(payload.metadata);
    } catch (metadataError: any) {
      return NextResponse.json(
        { status: false, error: metadataError.message || 'Metadata phải là JSON hợp lệ' },
        { status: 400 }
      );
    }

    const intervalUnit = intervalUnitRaw as IntervalUnit | null;

    const planData: Omit<DeviceReminderPlan, 'id'> = {
      deviceId,
      reminderType,
      eventTypeId,
      title: payload.title ? String(payload.title).trim() : null,
      description: payload.description ? String(payload.description).trim() : null,
      intervalValue,
      intervalUnit,
      cronExpression,
      startFrom: parseDate(payload.startFrom),
      endAt: parseDate(payload.endAt),
      nextDueDate: parseDate(payload.nextDueDate),
      lastTriggeredAt: parseDate(payload.lastTriggeredAt),
      isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
      metadata,
      createdBy: user.userId,
      createdAt: new Date(),
      updatedBy: user.userId,
      updatedAt: new Date(),
    };

    const service = new DeviceReminderPlanService();
    const id = await service.create(planData);

    return NextResponse.json({
      status: id > 0,
      data: { id },
    });
  } catch (error: any) {
    console.error('Create reminder plan error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi tạo kế hoạch nhắc nhở',
      },
      { status: 500 }
    );
  }
}

