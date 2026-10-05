import { NextRequest, NextResponse } from 'next/server';
import { WorkPlanService } from '@/lib/services/workPlanService';
import { requirePermission } from '@/lib/auth/middleware';
import { Permission } from '@/lib/auth/permissions';

const workPlanService = new WorkPlanService();

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authorization = await requirePermission(req, Permission.WorkPlanManage);
    if (!authorization.authorized) return authorization.response;

    const id = parseInt(params.id);
    const body = await req.json();
    const { action, planDate, staffId, title, draftData } = body;

    if (!staffId) {
      return NextResponse.json({ status: false, error: 'Missing staffId' }, { status: 400 });
    }

    if (action === 'update-details') {
      const success = await workPlanService.update(id, parseInt(staffId), title, draftData, parseInt(staffId), true);
      if (success) {
        return NextResponse.json({ status: true });
      } else {
        return NextResponse.json({ status: false, error: 'Failed to update plan. You may not have permission or it is already implemented.' }, { status: 403 });
      }
    } else {
      const success = await workPlanService.updateDate(id, planDate, parseInt(staffId), true);
      
      if (success) {
        return NextResponse.json({ status: true });
      } else {
        return NextResponse.json({ status: false, error: 'Failed to update plan date. You may not have permission.' }, { status: 403 });
      }
    }
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
