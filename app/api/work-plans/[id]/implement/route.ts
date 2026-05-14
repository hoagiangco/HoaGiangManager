import { NextRequest, NextResponse } from 'next/server';
import { WorkPlanService } from '@/lib/services/workPlanService';

const workPlanService = new WorkPlanService();

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { staffId, userId } = body;

    if (!staffId || !userId) {
      return NextResponse.json({ status: false, error: 'Missing staffId or userId' }, { status: 400 });
    }

    const reportId = await workPlanService.implement(parseInt(params.id), parseInt(staffId), userId);
    return NextResponse.json({ status: true, data: { reportId } });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
