import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';
import { StaffService } from '@/lib/services/staffService';
import { EventService } from '@/lib/services/eventService';
import { DamageReportStatus, EventStatus } from '@/types';

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

      if (resolvedDeviceId) {
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

    let handlerNotesUpdated = false;
    if (
      trimmedHandlerNotes !== undefined &&
      trimmedHandlerNotes !== previousHandlerNotes
    ) {
      await damageReportService.updateHandlerNotes(id, trimmedHandlerNotes, user.userId);
      handlerNotesUpdated = true;
    }

    if (nextStatus === DamageReportStatus.Completed && parsedEventTypeId && resolvedDeviceId) {
      const completedAt = new Date();
      try {
        await damageReportService.updateCompletionDate(id, completedAt, user.userId);

        const metadata = {
          source: 'damage-report-completion',
          damageReportId: id,
          previousStatus,
          handlerNotes: trimmedHandlerNotes ?? previousHandlerNotes ?? null,
        };

        await eventService.create({
          title:
            trimmedTitle ||
            (report.deviceName
              ? `Hoàn thành xử lý - ${report.deviceName}`
              : `Hoàn thành xử lý báo cáo #${id}`),
          deviceId: resolvedDeviceId,
          eventTypeId: parsedEventTypeId,
          description: trimmedDescription || report.damageContent || '',
          notes: trimmedHandlerNotes || previousHandlerNotes || null,
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




