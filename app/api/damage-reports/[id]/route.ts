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
    
    const isAdmin = user.roles && user.roles.includes('Admin');

    // Build safe payload
    let reportData: any = { id };

    if (isAdmin) {
      reportData = { ...body, id };
    } else {
      // Only allow updating Notes and Status for normal users
      if (body.notes !== undefined) reportData.notes = body.notes;
      if (body.status !== undefined) reportData.status = body.status;

      // No other fields are allowed
    }

    // Set updatedBy
    reportData.updatedBy = user.userId;

    const damageReportService = new DamageReportService();

    // For non-admin users, check ownership (createdBy or reporter linked to this user)
    if (!isAdmin) {
      const current = await damageReportService.getById(id);
      if (!current) {
        return NextResponse.json({ status: false, error: 'Không tìm thấy báo cáo' }, { status: 404 });
      }

      // Resolve staffId by userId
      const { rows } = await (await import('@/lib/db')).default.query(
        'SELECT "ID" FROM "Staff" WHERE "UserId" = $1',
        [user.userId]
      );
      const staffId = rows.length > 0 ? rows[0].ID : null;

      const isOwner = current?.createdBy === user.userId || (staffId && current?.reporterId === staffId);
      if (!isOwner) {
        return NextResponse.json({ status: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    await damageReportService.update(reportData);

    return NextResponse.json({
      status: true
    });
  } catch (error: any) {
    console.error('Update damage report error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi cập nhật báo cáo hư hỏng' },
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

    // Only Admin can delete damage reports
    if (!user.roles || !user.roles.includes('Admin')) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được xóa báo cáo hư hỏng' },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);
    const damageReportService = new DamageReportService();
    const result = await damageReportService.delete(id);

    return NextResponse.json({
      status: result
    });
  } catch (error: any) {
    console.error('Delete damage report error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi xóa báo cáo hư hỏng' },
      { status: 500 }
    );
  }
}

