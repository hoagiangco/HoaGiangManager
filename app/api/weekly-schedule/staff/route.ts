import { NextRequest, NextResponse } from 'next/server';
import { WeeklyScheduleService } from '@/lib/services/weeklyScheduleService';

export const dynamic = 'force-dynamic';

const svc = new WeeklyScheduleService();

/** GET — return selected staff list */
export async function GET(req: NextRequest) {
  try {
    const data = await svc.getSelectedStaff();
    return NextResponse.json({ status: true, data });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}

/** PUT — replace selected staff list */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffIds } = body;

    if (!Array.isArray(staffIds)) {
      return NextResponse.json({ status: false, error: 'staffIds must be an array' }, { status: 400 });
    }

    await svc.setSelectedStaff(staffIds);
    return NextResponse.json({ status: true });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
