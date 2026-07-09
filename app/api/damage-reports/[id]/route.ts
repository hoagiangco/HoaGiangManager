import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';

export async function GET(
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
    const damageReportService = new DamageReportService();
    const report = await damageReportService.getById(id);

    if (report) {
      const { isAdmin, isSupervisor } = await import('@/lib/auth/permissions');
      const isAdminUser = isAdmin(user.roles);
      const isSupervisorUser = isSupervisor(user.roles);
      
      // If not Supervisor/Admin, check if the user is reporter or handler
      if (!isSupervisorUser) {
        const staffService = new (await import('@/lib/services/staffService')).StaffService();
        const staff = await staffService.getByUserId(user.userId);
        if (!staff || (report.handlerId !== staff.id && report.reporterId !== staff.id && !report.coHandlerIds?.includes(staff.id))) {
          return NextResponse.json(
            { status: false, error: 'Forbidden: Bạn không có quyền xem báo cáo này' },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json({
      status: report !== null,
      data: report
    });
  } catch (error: any) {
    console.error('Get damage report error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi' },
      { status: 500 }
    );
  }
}

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
    
    const { isAdmin, isSupervisor } = await import('@/lib/auth/permissions');
    const isAdminUser = isAdmin(user.roles);
    const isSupervisorUser = isSupervisor(user.roles);

    const damageReportService = new DamageReportService();
    const existingReport = await damageReportService.getById(id);

    if (!existingReport) {
      return NextResponse.json(
        { status: false, error: 'Báo cáo không tồn tại' },
        { status: 404 }
      );
    }

    // Only Admin, Supervisor or the assigned Handler can edit damage reports
    if (!isAdminUser && !isSupervisorUser) {
      const staffService = new (await import('@/lib/services/staffService')).StaffService();
      const staff = await staffService.getByUserId(user.userId);
      
      if (!staff || (existingReport.handlerId !== staff.id && existingReport.reporterId !== staff.id && !existingReport.coHandlerIds?.includes(staff.id))) {
        return NextResponse.json(
          { status: false, error: 'Forbidden: Bạn không có quyền chỉnh sửa báo cáo này' },
          { status: 403 }
        );
      }
    }

    // Build safe payload
    const reportData: any = { ...body, id };

    // Set updatedBy
    reportData.updatedBy = user.userId;

    await damageReportService.update(reportData);

    return NextResponse.json({
      status: true
    });
  } catch (error: any) {
    console.error('Update damage report error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi cập nhật báo cáo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { searchParams } = new URL(request.url);
    const isHardDelete = searchParams.get('hard') === 'true';

    const { isAdmin, isSuperAdmin } = await import('@/lib/auth/permissions');
    
    // Check permission for hard delete
    if (isHardDelete && !isSuperAdmin(user.roles)) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ SuperAdmin mới được xóa vĩnh viễn báo cáo' },
        { status: 403 }
      );
    }

    // Only Admin or SuperAdmin can soft delete damage reports
    if (!isAdmin(user.roles)) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được xóa báo cáo' },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);
    const damageReportService = new DamageReportService();
    
    let result = false;
    if (isHardDelete) {
      result = await damageReportService.delete(id);
    } else {
      result = await damageReportService.softDelete(id, user.userId);
    }

    return NextResponse.json({
      status: result
    });
  } catch (error: any) {
    console.error('Delete damage report error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi xóa báo cáo' },
      { status: 500 }
    );
  }
}

