import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';
import { StaffService } from '@/lib/services/staffService';
import { EventService } from '@/lib/services/eventService';
import { DamageReportStatus, EventStatus } from '@/types';
import pool from '@/lib/db';

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
    const body = await request.json();
    const {
      status,
      eventTypeId,
      eventTitle,
      eventDescription,
      eventDeviceId,
      handlerNotes,
    } = body || {};

    // Admin and User can update status
    const isAdmin = user.roles && user.roles.includes('Admin');
    const isUser = user.roles && user.roles.includes('User');
    
    if (!isAdmin && !isUser) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Bạn không có quyền cập nhật trạng thái' },
        { status: 403 }
      );
    }

    if (status === undefined || status === null) {
      return NextResponse.json(
        { status: false, error: 'Thiếu trạng thái' },
        { status: 400 }
      );
    }

    const nextStatus = Number(status);

    if (!Object.values(DamageReportStatus).includes(nextStatus)) {
      return NextResponse.json(
        { status: false, error: 'Trạng thái không hợp lệ' },
        { status: 400 }
      );
    }

    const damageReportService = new DamageReportService();
    const report = await damageReportService.getById(id);

    if (!report) {
      return NextResponse.json(
        { status: false, error: 'Báo cáo không tồn tại' },
        { status: 404 }
      );
    }

    if (!isAdmin) {
      const staffService = new StaffService();
      const staff = await staffService.getByUserId(user.userId);

      if (!staff || !report.handlerId || report.handlerId !== staff.id) {
        return NextResponse.json(
          { status: false, error: 'Bạn chỉ có thể cập nhật trạng thái khi là người xử lý báo cáo này' },
          { status: 403 }
        );
      }
    }

    const previousStatus = report.status as DamageReportStatus;
    const previousHandlerNotes = report.handlerNotes || '';

    let parsedEventTypeId: number | null = null;
    let resolvedDeviceId: number | null = null;
    const trimmedTitle = typeof eventTitle === 'string' ? eventTitle.trim() : '';
    const trimmedDescription = typeof eventDescription === 'string' ? eventDescription.trim() : '';
    const trimmedHandlerNotes =
      typeof handlerNotes === 'string' ? handlerNotes.trim() : undefined;

    if (nextStatus === DamageReportStatus.Completed) {
      // For maintenance reports, allow completion without deviceId
      const isMaintenanceReport = !!report.maintenanceBatchId;
      
      if (eventDeviceId) {
        const deviceParsed = Number(eventDeviceId);
        if (Number.isNaN(deviceParsed) || deviceParsed <= 0) {
          return NextResponse.json(
            { status: false, error: 'Thiết bị không hợp lệ' },
            { status: 400 }
          );
        }
        resolvedDeviceId = deviceParsed;
      } else if (report.deviceId) {
        resolvedDeviceId = report.deviceId;
      }

      // For maintenance reports, eventTypeId is required but deviceId is optional
      if (resolvedDeviceId || isMaintenanceReport) {
        parsedEventTypeId = eventTypeId ? Number(eventTypeId) : NaN;
        if (!parsedEventTypeId || Number.isNaN(parsedEventTypeId) || parsedEventTypeId <= 0) {
          return NextResponse.json(
            { status: false, error: 'Vui lòng chọn loại xử lý khi hoàn thành báo cáo' },
            { status: 400 }
          );
        }
      }
    }

    const eventService = new EventService();

    await damageReportService.updateStatus(id, nextStatus as DamageReportStatus, user.userId);

    // Khi chuyển từ Pending (1) sang InProgress (3), tự động gán ngày bắt đầu là ngày hiện tại
    if (previousStatus === DamageReportStatus.Pending && nextStatus === DamageReportStatus.InProgress) {
      const handlingDate = new Date();
      await damageReportService.updateHandlingDate(id, handlingDate, user.userId);
    }

    // Khi đổi status thành Completed, tự động gán ngày hoàn thành là ngày hiện tại
    let completedAt: Date | null = null;
    if (nextStatus === DamageReportStatus.Completed) {
      completedAt = new Date();
      await damageReportService.updateCompletionDate(id, completedAt, user.userId);
    }

    if (
      trimmedHandlerNotes !== undefined &&
      trimmedHandlerNotes !== previousHandlerNotes
    ) {
      await damageReportService.updateHandlerNotes(id, trimmedHandlerNotes, user.userId);
    }

    // Consolidated Sync logic for maintenance batch or regular report completion
    const isMaintenanceReport = !!report.maintenanceBatchId;
    
    if (isMaintenanceReport) {
      // Use the newly created service method for maintenance sync
      await damageReportService.syncMaintenanceBatchEvents(id, nextStatus, user.userId, {
        handlerId: report.handlerId,
        handlingDate: report.handlingDate,
        handlerNotes: trimmedHandlerNotes ?? previousHandlerNotes ?? null,
        damageContent: report.damageContent,
        eventTypeId: parsedEventTypeId,
        eventTitle: trimmedTitle,
        eventDescription: trimmedDescription,
      });
    } else if (nextStatus === DamageReportStatus.Completed && parsedEventTypeId && resolvedDeviceId) {
      // For regular reports completion, create a single event
      if (!completedAt) completedAt = new Date();
      
      await eventService.create({
        title: trimmedTitle || (report.deviceName ? `Hoàn thành xử lý - ${report.deviceName}` : `Hoàn thành xử lý báo cáo #${id}`),
        deviceId: resolvedDeviceId || null,
        eventTypeId: parsedEventTypeId,
        description: trimmedDescription || report.damageContent || '',
        notes: trimmedHandlerNotes || previousHandlerNotes || '',
        status: EventStatus.Completed,
        eventDate: completedAt,
        startDate: report.handlingDate ? new Date(report.handlingDate) : completedAt,
        endDate: completedAt,
        staffId: report.handlerId || null,
        relatedReportId: id,
        metadata: {
          source: 'damage-report-completion',
          damageReportId: id,
          previousStatus,
        },
        createdBy: user.userId,
        createdAt: completedAt,
        updatedBy: user.userId,
        updatedAt: completedAt,
      });
    }

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




