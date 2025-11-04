import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { StaffService } from '@/lib/services/staffService';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const departmentId = parseInt(searchParams.get('departmentId') || '0');

    const staffService = new StaffService();
    const staff = await staffService.getStaffByDepartment(departmentId);

    return NextResponse.json({
      status: true,
      data: staff
    });
  } catch (error: any) {
    console.error('Get staff error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const staffData = await request.json();
    const staffService = new StaffService();
    const id = await staffService.create(staffData);

    return NextResponse.json({
      status: id > 0,
      data: { id }
    });
  } catch (error: any) {
    console.error('Create staff error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi tạo nhân viên' },
      { status: 500 }
    );
  }
}

