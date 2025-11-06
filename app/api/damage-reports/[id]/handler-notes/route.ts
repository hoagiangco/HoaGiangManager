import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';

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
    const { handlerNotes } = await request.json();

    // Admin and User can update handler notes
    const isAdmin = user.roles && user.roles.includes('Admin');
    const isUser = user.roles && user.roles.includes('User');
    
    if (!isAdmin && !isUser) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Bạn không có quyền cập nhật ghi chú người xử lý' },
        { status: 403 }
      );
    }

    const damageReportService = new DamageReportService();
    await damageReportService.updateHandlerNotes(id, handlerNotes || '', user.userId);

    return NextResponse.json({
      status: true
    });
  } catch (error: any) {
    console.error('Update handler notes error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi cập nhật ghi chú người xử lý' },
      { status: 500 }
    );
  }
}



