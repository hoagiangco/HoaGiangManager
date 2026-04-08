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
    const { images } = await request.json();

    if (!images || !Array.isArray(images)) {
      return NextResponse.json(
        { status: false, error: 'Danh sách hình ảnh không hợp lệ' },
        { status: 400 }
      );
    }

    const isAdmin = user.roles && user.roles.includes('Admin');
    const isUser = user.roles && user.roles.includes('User');
    
    if (!isAdmin && !isUser) {
      return NextResponse.json(
        { status: false, error: 'Forbidden: Bạn không có quyền cập nhật hình ảnh báo cáo' },
        { status: 403 }
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

    let finalImages = images;

    if (!isAdmin) {
      const staffService = new (await import('@/lib/services/staffService')).StaffService();
      const staff = await staffService.getByUserId(user.userId);
      
      if (!staff || report.handlerId !== staff.id) {
        return NextResponse.json(
          { status: false, error: 'Forbidden: Bạn chỉ được phép cập nhật khi là người xử lý báo cáo này' },
          { status: 403 }
        );
      }

      // "Only add, no delete" logic for handlers
      const currentImages = report.images || [];
      
      // Ensure all current images are still in the new list
      const missingAny = currentImages.some(img => !images.includes(img));
      if (missingAny) {
        // Automatically re-include current images if they were missing (to be safe/robust)
        // or just enforce it.
        finalImages = Array.from(new Set([...currentImages, ...images]));
      }
    }

    await damageReportService.updateImages(id, finalImages, user.userId);

    return NextResponse.json({
      status: true,
      images: finalImages
    });
  } catch (error: any) {
    console.error('Update report images error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi cập nhật hình ảnh' },
      { status: 500 }
    );
  }
}
