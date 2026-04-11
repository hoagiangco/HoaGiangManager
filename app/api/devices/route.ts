import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DeviceService } from '@/lib/services/deviceService';

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
    const categoryId = parseInt(searchParams.get('cateId') || '0');
    const departmentId = parseInt(searchParams.get('departmentId') || '0');
    const locationId = parseInt(searchParams.get('locationId') || '0');
    const status = parseInt(searchParams.get('status') || '0');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortField = searchParams.get('sortField') || 'name';
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc';

    const deviceService = new DeviceService();
    const result = await deviceService.getPaginated({
      page,
      limit,
      categoryId,
      departmentId,
      locationId,
      status,
      search,
      sortField,
      sortOrder
    });

    return NextResponse.json({
      status: true,
      data: result.devices,
      total: result.total
    });
  } catch (error: any) {
    console.error('Get devices error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return NextResponse.json(
      { 
        status: false, 
        error: error.message || 'Đã xảy ra lỗi',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
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

    const deviceData = await request.json();
    console.log('Creating device with data:', deviceData);
    
    const deviceService = new DeviceService();
    const id = await deviceService.create(deviceData);

    console.log('Device created successfully with ID:', id);

    return NextResponse.json({
      status: id > 0,
      data: { id }
    });
  } catch (error: any) {
    console.error('Create device error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return NextResponse.json(
      { 
        status: false, 
        error: error.message || 'Đã xảy ra lỗi khi tạo thiết bị',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

