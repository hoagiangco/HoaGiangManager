import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { StaffService } from '@/lib/services/staffService';

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only Admin can sync names
    if (!user.roles || !user.roles.includes('Admin')) {
      return NextResponse.json(
        { status: false, error: 'Chỉ quản trị viên mới được thực hiện thao tác này' },
        { status: 403 }
      );
    }

    const staffService = new StaffService();
    const result = await staffService.syncNamesWithUsers();

    return NextResponse.json({
      status: true,
      data: result,
      message: `Đã đồng bộ ${result.synced} tài khoản${result.errors.length > 0 ? `. ${result.errors.length} lỗi xảy ra.` : '.'}`
    });
  } catch (error: any) {
    console.error('Sync names error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi đồng bộ tên' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only Admin can check name mismatches
    if (!user.roles || !user.roles.includes('Admin')) {
      return NextResponse.json(
        { status: false, error: 'Chỉ quản trị viên mới được thực hiện thao tác này' },
        { status: 403 }
      );
    }

    const staffService = new StaffService();
    const mismatches = await staffService.getNameMismatches();

    return NextResponse.json({
      status: true,
      data: mismatches,
      count: mismatches.length
    });
  } catch (error: any) {
    console.error('Get name mismatches error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi kiểm tra' },
      { status: 500 }
    );
  }
}



