import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { SparePartService } from '@/lib/services/sparePartService';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sparePartId = searchParams.get('sparePartId') ? parseInt(searchParams.get('sparePartId')!) : undefined;
    const type = searchParams.get('type') as any;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const sparePartService = new SparePartService();
    const result = await sparePartService.getTransactions({ 
      sparePartId, 
      type, 
      startDate, 
      endDate, 
      limit, 
      offset 
    });

    return NextResponse.json({
      status: true,
      data: result.items,
      total: result.total
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) return NextResponse.json({ status: false, error: error || 'Unauthorized' }, { status: 401 });

    const data = await request.json();
    const sparePartService = new SparePartService();
    
    // Add createdBy from authenticated user
    const id = await sparePartService.createTransaction({
      ...data,
      createdBy: user.userId
    });

    return NextResponse.json({ status: true, data: { id } });
  } catch (error: any) {
    console.error('Create transaction error:', error);
    return NextResponse.json({ status: false, error: error.message || 'Đã xảy ra lỗi' }, { status: 500 });
  }
}
