import { NextRequest, NextResponse } from 'next/server';
import { WeeklyScheduleService } from '@/lib/services/weeklyScheduleService';
import { requirePermission } from '@/lib/auth/middleware';
import { Permission } from '@/lib/auth/permissions';

const svc = new WeeklyScheduleService();

export async function GET(req: NextRequest) {
  try {
    const authorization = await requirePermission(req, Permission.WeeklyScheduleManage);
    if (!authorization.authorized) return authorization.response;

    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('weekStart');
    const departmentId = parseInt(searchParams.get('departmentId') || '0');

    if (!weekStart) {
      return NextResponse.json({ status: false, error: 'Missing weekStart' }, { status: 400 });
    }

    const monday = WeeklyScheduleService.getMondayOf(weekStart);
    const data = await svc.getWeeklySchedule(monday, departmentId);
    const weeklyMeta = await svc.getWeeklyMeta(monday);
    return NextResponse.json({
      status: true,
      data,
      weeklyNote: weeklyMeta.note,
      weeklyMeta,
      weekStart: monday
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authorization = await requirePermission(req, Permission.WeeklyScheduleManage);
    if (!authorization.authorized) return authorization.response;

    const body = await req.json();
    const { cells, weeklyNote, approvedImageUrl, creatorSignatureUrl, creatorName, weekStart } = body;

    const targetWeekStart =
      weekStart ||
      (Array.isArray(cells) && cells.length > 0 ? cells[0].weekStartDate : undefined) ||
      '';

    if (!targetWeekStart) {
      return NextResponse.json({ status: false, error: 'Thiếu thông tin tuần (weekStart)' }, { status: 400 });
    }

    // Atomic transaction for the entire weekly schedule update with week boundary verification
    await svc.saveCompleteWeek({
      weekStart: targetWeekStart,
      cells,
      weeklyNote,
      approvedImageUrl,
      creatorSignatureUrl,
      creatorName,
      userId: authorization.user.userId,
      userEmail: authorization.user.email,
    });

    try {
      const { logAudit } = await import('@/lib/services/auditService');
      await logAudit(
        null,
        authorization.user.userId,
        'UPDATE',
        'WeeklySchedule',
        targetWeekStart,
        null,
        {
          weekStart: targetWeekStart,
          cellsCount: Array.isArray(cells) ? cells.length : 0,
          hasWeeklyNote: weeklyNote !== undefined,
          hasApprovedImage: !!approvedImageUrl,
          hasSignature: !!creatorSignatureUrl
        }
      );
    } catch (auditErr) {
      console.error('Audit log error on weekly schedule save:', auditErr);
    }

    return NextResponse.json({ status: true });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
