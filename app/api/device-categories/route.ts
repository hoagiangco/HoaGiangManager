import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DeviceCategoryService } from '@/lib/services/deviceCategoryService';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const categoryService = new DeviceCategoryService();
    const categories = await categoryService.getAll();

    return NextResponse.json({
      status: true,
      data: categories
    });
  } catch (error: any) {
    console.error('Get device categories error:', error);
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

    const categoryData = await request.json();
    const categoryService = new DeviceCategoryService();
    const id = await categoryService.create(categoryData);

    return NextResponse.json({
      status: id > 0,
      data: { id }
    });
  } catch (error: any) {
    console.error('Create device category error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi khi tạo danh mục thiết bị' },
      { status: 500 }
    );
  }
}

