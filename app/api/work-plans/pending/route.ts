import { NextRequest, NextResponse } from 'next/server';
import { WorkPlanService } from '@/lib/services/workPlanService';
import { requirePermission } from '@/lib/auth/middleware';
import { Permission } from '@/lib/auth/permissions';

const workPlanService = new WorkPlanService();

export async function GET(req: NextRequest) {
  try {
    const authorization = await requirePermission(req, Permission.WorkPlanManage);
    if (!authorization.authorized) return authorization.response;

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');

    if (!staffId) {
      return NextResponse.json({ status: false, error: 'Missing staffId' }, { status: 400 });
    }

    const items = await workPlanService.getPendingReports(parseInt(staffId));
    return NextResponse.json({ status: true, data: items });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
