import { NextRequest, NextResponse } from 'next/server';
import { WorkPlanService } from '@/lib/services/workPlanService';
import { ApiResponse } from '@/types';
import { format } from 'date-fns';
import { getVNNow } from '@/lib/utils/dateFormat';

const workPlanService = new WorkPlanService();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const staffId = searchParams.get('staffId');
    const archive = searchParams.get('archive') === 'true';

    if (!staffId) {
      return NextResponse.json({ status: false, error: 'Missing staffId' }, { status: 400 });
    }

    if (archive) {
      const items = await workPlanService.listArchive(parseInt(staffId));
      return NextResponse.json({ status: true, data: items });
    }

    if (!date) {
      return NextResponse.json({ status: false, error: 'Missing date' }, { status: 400 });
    }

    const today = format(getVNNow(), 'yyyy-MM-dd');
    if (date <= today) {
      await workPlanService.implementDuePlans(today, 'system', parseInt(staffId));
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
