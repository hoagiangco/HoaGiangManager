import { NextRequest, NextResponse } from 'next/server';
import { WorkPlanService } from '@/lib/services/workPlanService';
import { ApiResponse } from '@/types';

const workPlanService = new WorkPlanService();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const staffId = searchParams.get('staffId');

    if (!date || !staffId) {
      return NextResponse.json({ status: false, error: 'Missing date or staffId' }, { status: 400 });
    }

    const items = await workPlanService.list(date, parseInt(staffId));
    return NextResponse.json({ status: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = await workPlanService.create(body);
    return NextResponse.json({ status: true, data: { id } });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const staffId = searchParams.get('staffId');
    const isAdmin = searchParams.get('isAdmin') === 'true';

    if (!id || !staffId) {
      return NextResponse.json({ status: false, error: 'Missing id or staffId' }, { status: 400 });
    }

    const success = await workPlanService.delete(parseInt(id), parseInt(staffId), isAdmin);
    return NextResponse.json({ status: success });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
