import { NextRequest, NextResponse } from 'next/server';
import { WorkPlanService } from '@/lib/services/workPlanService';

const workPlanService = new WorkPlanService();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const staffId = searchParams.get('staffId');

    if (!startDate || !endDate) {
      return NextResponse.json({ status: false, error: 'Missing startDate or endDate' }, { status: 400 });
    }

    const items = await workPlanService.getActiveDates(startDate, endDate, parseInt(staffId || '0'));
    return NextResponse.json({ status: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
