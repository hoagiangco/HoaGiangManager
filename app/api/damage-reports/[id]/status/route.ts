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
    const previousCompletedDate = report.completedDate ? new Date(report.completedDate) : null;
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

    let handlerNotesUpdated = false;
    if (
      trimmedHandlerNotes !== undefined &&
      trimmedHandlerNotes !== previousHandlerNotes
    ) {
      await damageReportService.updateHandlerNotes(id, trimmedHandlerNotes, user.userId);
      handlerNotesUpdated = true;
    }

    // For maintenance reports, allow creating event without deviceId
    const isMaintenanceReport = !!report.maintenanceBatchId;
    
    if (nextStatus === DamageReportStatus.Completed && parsedEventTypeId && (resolvedDeviceId || isMaintenanceReport)) {
      // completedAt đã được set ở trên
      if (!completedAt) {
        completedAt = new Date();
      }
      try {

        const metadata: any = {
          source: 'damage-report-completion',
          damageReportId: id,
          previousStatus,
          handlerNotes: trimmedHandlerNotes ?? previousHandlerNotes ?? null,
        };

        // Nếu damage report có maintenanceBatchId, thêm vào metadata của event
        if (report.maintenanceBatchId) {
          metadata.maintenanceBatchId = report.maintenanceBatchId;
        }

        // For maintenance reports, create events for all devices in the batch
        if (isMaintenanceReport && report.maintenanceBatchId) {
          // Get all active plans in this batch
          const plansResult = await pool.query(
            `
            SELECT 
              drp."DeviceID" as "deviceId",
              drp."Title" as title,
              d."Name" as "deviceName"
            FROM "DeviceReminderPlan" drp
            LEFT JOIN "Device" d ON drp."DeviceID" = d."ID"
            WHERE drp."Metadata" IS NOT NULL
              AND (
                drp."Metadata"::text LIKE '%"maintenanceBatchId":"' || $1 || '"%'
                OR (drp."Metadata"::jsonb ? 'maintenanceBatchId' 
                    AND (drp."Metadata"->>'maintenanceBatchId') = $1)
              )
              AND drp."IsActive" = true
            `,
            [report.maintenanceBatchId]
          );

          const plans = plansResult.rows || [];
          
          if (plans.length === 0) {
            throw new Error('Không tìm thấy thiết bị nào trong đợt bảo trì này');
          }

          // Create event for each device in the batch
          const eventPromises = plans.map((plan: any) => {
            return eventService.create({
              title:
                trimmedTitle ||
                (plan.deviceName
                  ? `Bảo trì định kỳ - ${plan.deviceName}`
                  : `Bảo trì định kỳ - ${plan.title || report.damageContent || 'Bảo trì'}`),
              deviceId: plan.deviceId,
              eventTypeId: parsedEventTypeId,
              description: trimmedDescription || report.damageContent || plan.title || '',
              notes: trimmedHandlerNotes || previousHandlerNotes || '', // Ensure notes is never null
              status: EventStatus.Completed,
              eventDate: completedAt,
              startDate: report.handlingDate ? new Date(report.handlingDate) : completedAt,
              endDate: completedAt,
              staffId: report.handlerId || null,
              relatedReportId: id,
              metadata,
              createdBy: user.userId,
              createdAt: completedAt,
              updatedBy: user.userId,
              updatedAt: completedAt,
            });
          });

          await Promise.all(eventPromises);
        } else {
          // For regular reports, create a single event
          await eventService.create({
            title:
              trimmedTitle ||
              (report.deviceName
                ? `Hoàn thành xử lý - ${report.deviceName}`
                : `Hoàn thành xử lý báo cáo #${id}`),
            deviceId: resolvedDeviceId || null,
            eventTypeId: parsedEventTypeId,
            description: trimmedDescription || report.damageContent || '',
            notes: trimmedHandlerNotes || previousHandlerNotes || '', // Ensure notes is never null
            status: EventStatus.Completed,
            eventDate: completedAt,
            startDate: report.handlingDate ? new Date(report.handlingDate) : completedAt,
            endDate: completedAt,
            staffId: report.handlerId || null,
            relatedReportId: id,
            metadata,
            createdBy: user.userId,
            createdAt: completedAt,
            updatedBy: user.userId,
            updatedAt: completedAt,
          });
        }
      } catch (eventError: any) {
        // Revert handler notes if updated
        if (handlerNotesUpdated) {
          try {
            await damageReportService.updateHandlerNotes(id, previousHandlerNotes, user.userId);
          } catch (revertError) {
            console.error('Failed to revert handler notes after event creation error:', revertError);
          }
        }
        // Revert status and completion date
        try {
          await damageReportService.updateStatus(id, previousStatus, user.userId);
        } catch (revertStatusError) {
          console.error('Failed to revert status after event creation error:', revertStatusError);
        }
        try {
          await damageReportService.updateCompletionDate(id, previousCompletedDate, user.userId);
        } catch (revertCompletionError) {
          console.error('Failed to revert completion date after event creation error:', revertCompletionError);
        }

        console.error('Failed to create completion event:', eventError);
        return NextResponse.json(
          { status: false, error: eventError.message || 'Không thể tạo sự kiện cho thiết bị' },
          { status: 500 }
        );
      }
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




