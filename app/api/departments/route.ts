import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DepartmentService } from '@/lib/services/departmentService';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const departmentService = new DepartmentService();
    const departments = await departmentService.getAll();

    return NextResponse.json({
      status: true,
      data: departments
    });
  } catch (error: any) {
    console.error('Get departments error:', error);
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

    const departmentData = await request.json();
    const departmentService = new DepartmentService();
    const id = await departmentService.create(departmentData);

    return NextResponse.json({
      status: id > 0,
      data: { id }
    });
  } catch (error: any) {
    console.error('Create department error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi tạo phòng ban' },
      { status: 500 }
    );
  }
}

