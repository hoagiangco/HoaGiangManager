import { NextRequest, NextResponse } from 'next/server';
import { WorkPlanService } from '@/lib/services/workPlanService';
import { requirePermission } from '@/lib/auth/middleware';
import { Permission } from '@/lib/auth/permissions';

const workPlanService = new WorkPlanService();

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authorization = await requirePermission(req, Permission.WorkPlanManage);
    if (!authorization.authorized) return authorization.response;

    const body = await req.json();
    const { staffId } = body;

    if (!staffId) {
      return NextResponse.json({ status: false, error: 'Missing staffId' }, { status: 400 });
    }

    const reportId = await workPlanService.implement(
      parseInt(params.id),
      parseInt(staffId),
      authorization.user.userId
    );
    return NextResponse.json({ status: true, data: { reportId } });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
