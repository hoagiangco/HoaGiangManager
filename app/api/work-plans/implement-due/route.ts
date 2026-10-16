import { NextRequest, NextResponse } from 'next/server';
import { WorkPlanService } from '@/lib/services/workPlanService';
import { requirePermission } from '@/lib/auth/middleware';
import { Permission } from '@/lib/auth/permissions';
import { format } from 'date-fns';
import { getVNNow } from '@/lib/utils/dateFormat';

const workPlanService = new WorkPlanService();

export async function POST(req: NextRequest) {
  try {
    const authorization = await requirePermission(req, Permission.WorkPlanManage);
    if (!authorization.authorized) return authorization.response;

    const body = await req.json().catch(() => ({}));
    const staffId = body?.staffId ? parseInt(body.staffId) : 0;
    const dueDate = body?.dueDate || format(getVNNow(), 'yyyy-MM-dd');

    const count = await workPlanService.implementDuePlans(
      dueDate,
      authorization.user.userId,
      staffId
    );

    return NextResponse.json({
      status: true,
      message: `Đã triển khai thành công ${count} kế hoạch công việc đến hạn`,
      data: { implementedCount: count }
    });
  } catch (error: any) {
    console.error('Implement due work plans error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi triển khai kế hoạch đến hạn' },
      { status: 500 }
    );
  }
}
