import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';

/**
 * Restore a soft-deleted damage report (IsDeleted = true -> false).
 * Only Admin or SuperAdmin (same permission as soft delete).
 */
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

    const { isAdmin } = await import('@/lib/auth/permissions');
    if (!isAdmin(user.roles)) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Chỉ quản trị viên mới được khôi phục báo cáo' },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { status: false, error: 'ID báo cáo không hợp lệ' },
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

    if (!report.isDeleted) {
      return NextResponse.json(
        { status: false, error: 'Báo cáo chưa bị xóa' },
        { status: 400 }
      );
    }

    const result = await damageReportService.restore(id, user.userId);

    return NextResponse.json({ status: result });
  } catch (error: any) {
    console.error('Restore damage report error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi khôi phục báo cáo' },
      { status: 500 }
    );
  }
}
