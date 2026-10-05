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

    if (cells && Array.isArray(cells) && cells.length > 0) {
      await svc.upsertBatch(cells, authorization.user.userId);
    }
    
    if (weeklyNote !== undefined && weekStart) {
      await svc.setWeeklyNote(weekStart, weeklyNote);
    }

    if (approvedImageUrl !== undefined && weekStart) {
      await svc.setApprovedImage(weekStart, approvedImageUrl, authorization.user.email);
    }

    if ((creatorSignatureUrl !== undefined || creatorName !== undefined) && weekStart) {
      await svc.setCreatorSignature(weekStart, creatorSignatureUrl, creatorName);
    }

    return NextResponse.json({ status: true });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
