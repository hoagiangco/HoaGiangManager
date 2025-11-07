import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';
import { StaffService } from '@/lib/services/staffService';
import { DamageReportStatus } from '@/types';

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
    const { status } = await request.json();

    // Admin and User can update status
    const isAdmin = user.roles && user.roles.includes('Admin');
    const isUser = user.roles && user.roles.includes('User');
    
    if (!isAdmin && !isUser) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Bạn không có quyền cập nhật trạng thái' },
        { status: 403 }
      );
    }

    if (!status || ![1, 2, 3, 4, 5, 6].includes(status)) {
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

    await damageReportService.updateStatus(id, status as DamageReportStatus, user.userId);

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




