import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DeviceReminderPlanService } from '@/lib/services/deviceReminderPlanService';
import { DeviceService } from '@/lib/services/deviceService';
import { DeviceReminderPlan, EventCategory } from '@/types';

import { calculateNextDueDate, ScheduleConfig } from '@/lib/utils/maintenanceScheduler';

const parseDate = (value: any): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      deviceIds,
      categoryId,
      eventTypeId,
      title,
      description,
      intervalValue,
      intervalUnit,
      startFrom,
      endAt,
      metadata,
    } = body;

    // Validate required fields
    if (!eventTypeId || eventTypeId <= 0) {
      return NextResponse.json(
        { status: false, error: 'EventTypeID là bắt buộc' },
        { status: 400 }
      );
    }

    if (!intervalValue || intervalValue <= 0) {
      return NextResponse.json(
        { status: false, error: 'IntervalValue phải lớn hơn 0' },
        { status: 400 }
      );
    }

    if (!intervalUnit || !['day', 'week', 'month', 'year'].includes(intervalUnit)) {
      return NextResponse.json(
        { status: false, error: 'IntervalUnit không hợp lệ' },
        { status: 400 }
      );
    }

    const startFromDate = parseDate(startFrom);
    if (!startFromDate) {
      return NextResponse.json(
        { status: false, error: 'StartFrom là bắt buộc và phải là ngày hợp lệ' },
        { status: 400 }
      );
    }

    // Get devices based on criteria
    const deviceService = new DeviceService();
    let devices: any[] = [];

    if (deviceIds && Array.isArray(deviceIds) && deviceIds.length > 0) {
      // Get devices by IDs (priority)
      devices = await deviceService.getDevicesByIds(deviceIds);
    } else if (categoryId && categoryId > 0) {
      // Get devices by category
      devices = await deviceService.getDeviceByCategory(categoryId);
    } else {
      return NextResponse.json(
        { status: false, error: 'Phải cung cấp deviceIds hoặc categoryId' },
        { status: 400 }
      );
    }

    if (devices.length === 0) {
      return NextResponse.json(
        { status: false, error: 'Không tìm thấy thiết bị nào' },
        { status: 400 }
      );
    }

    // Generate maintenanceBatchId if not provided
    const batchId = metadata?.maintenanceBatchId || `batch-${new Date().toISOString().split('T')[0]}-${Date.now()}`;
    
    // Prepare metadata with batch ID
    const planMetadata = {
      ...metadata,
      maintenanceBatchId: batchId,
    };

    // Calculate nextDueDate: If using specific dates, calculate based on it. Otherwise startFrom.
    const scheduleConfig = planMetadata?.scheduleConfig as ScheduleConfig | null;
    const nextDueDate = scheduleConfig?.scheduleType === 'specific_dates' 
        ? calculateNextDueDate(startFromDate, intervalValue, intervalUnit as any, scheduleConfig, true)
        : new Date(startFromDate);

    // Create reminder plans for each device
    const reminderPlanService = new DeviceReminderPlanService();
    const createdPlanIds: number[] = [];

    for (const device of devices) {
      const plan: Omit<DeviceReminderPlan, 'id'> = {
        deviceId: device.id,
        reminderType: (metadata?.reminderType || 'maintenance') as EventCategory | 'custom',
        eventTypeId,
        title: title || `Bảo trì định kỳ - ${device.name}`,
        description: description || null,
        intervalValue,
        intervalUnit,
        cronExpression: null,
        startFrom: startFromDate,
        endAt: parseDate(endAt),
        nextDueDate,
        lastTriggeredAt: null,
        isActive: true,
        metadata: planMetadata,
        createdBy: (user as any).email || null,
        createdAt: new Date(),
        updatedBy: (user as any).email || null,
        updatedAt: new Date(),
      };

      const planId = await reminderPlanService.create(plan);
      createdPlanIds.push(planId);
    }

    return NextResponse.json({
      status: true,
      data: {
        created: createdPlanIds.length,
        plans: createdPlanIds,
        maintenanceBatchId: batchId,
      },
    });
  } catch (error: any) {
    console.error('Bulk create reminder plans error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi tạo kế hoạch bảo trì',
      },
      { status: 500 }
    );
  }
}

