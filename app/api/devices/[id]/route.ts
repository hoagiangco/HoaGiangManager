import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DeviceService } from '@/lib/services/deviceService';

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
    const deviceService = new DeviceService();
    const device = await deviceService.getById(id);

    return NextResponse.json({
      status: device !== null,
      data: device
    });
  } catch (error: any) {
    console.error('Get device error:', error);
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
    const deviceData = await request.json();
    console.log(`Updating device ${id} with data:`, deviceData);
    
    const deviceService = new DeviceService();
    await deviceService.update({ ...deviceData, id });

    console.log(`Device ${id} updated successfully`);

    return NextResponse.json({
      status: true
    });
  } catch (error: any) {
    console.error('Update device error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return NextResponse.json(
      { 
        status: false, 
        error: error.message || 'Đã xảy ra lỗi khi cập nhật thiết bị',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
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

    const id = parseInt(params.id);
    console.log(`Deleting device ${id}`);
    
    const deviceService = new DeviceService();
    const result = await deviceService.delete(id);

    console.log(`Device ${id} deleted:`, result);

    return NextResponse.json({
      status: result
    });
  } catch (error: any) {
    console.error('Delete device error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    return NextResponse.json(
      { 
        status: false, 
        error: error.message || 'Đã xảy ra lỗi khi xóa thiết bị',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

