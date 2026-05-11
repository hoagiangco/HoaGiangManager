import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';
import { DamageReportPriority } from '@/types';
import { getVNTodayStr } from '@/lib/utils/dateFormat';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const departmentId = parseInt(searchParams.get('departmentId') || '0');
    const staffId = parseInt(searchParams.get('staffId') || '0');
    const category = searchParams.get('category') || 'all'; // all, pending, completed, backlog, priority

    // Use date string directly for getDailyReportData to avoid UTC timezone shift
    let targetDateStr: string;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      targetDateStr = dateParam;
    } else {
      targetDateStr = getVNTodayStr();
    }

    const damageReportService = new DamageReportService();
    const data = await damageReportService.getDailyReportData(targetDateStr, {
      departmentId: departmentId > 0 ? departmentId : undefined,
      handlerId: staffId > 0 ? staffId : undefined
    });

    // Flatten and tag reports
    let reports: any[] = [];

    // Tag each report with its daily category and section (for print/excel consistency)
    const taggedNew = data.newReports.map(r => ({ ...r, dailyCategory: '1. VIỆC TRONG NGÀY', section: '1. VIỆC TRONG NGÀY' }));
    const taggedActive = data.activeReports.map(r => ({ ...r, dailyCategory: '1. VIỆC TRONG NGÀY', section: '1. VIỆC TRONG NGÀY' }));
    const taggedCompleted = data.completedReports.map(r => ({ ...r, dailyCategory: '1. VIỆC TRONG NGÀY', section: '1. VIỆC TRONG NGÀY' }));
    const taggedPendingActive = data.pendingActiveReports.map(r => ({ ...r, dailyCategory: '2. VIỆC ĐANG XỬ LÝ', section: '2. VIỆC ĐANG XỬ LÝ' }));
    const taggedPending = data.pendingReports.map(r => ({ ...r, dailyCategory: '3. VIỆC CHỜ XỬ LÝ', section: '3. VIỆC CHỜ XỬ LÝ' }));

    // Combine all
    reports = [...taggedNew, ...taggedActive, ...taggedCompleted, ...taggedPendingActive, ...taggedPending];

    // Apply category filtering if requested
    if (category !== 'all') {
      if (category === 'today') {
        reports = reports.filter(r => r.dailyCategory === '1. VIỆC TRONG NGÀY');
      } else if (category === 'pendingActive') {
        reports = reports.filter(r => r.status === 3);
      } else if (category === 'pending') {
        reports = reports.filter(r => r.status === 1 || r.status === 2);
      } else if (category === 'priority') {
        reports = reports.filter(r => r.priority >= DamageReportPriority.High);
      }
    }

    return NextResponse.json({
      status: true,
      data: reports,
      summary: data.summary,
      recordCount: reports.length
    });
  } catch (error: any) {
    console.error('Daily report list error:', error);
    return NextResponse.json(
      { status: false, error: 'Lỗi khi lấy danh sách báo cáo ngày: ' + (error.message || 'Đã xảy ra lỗi') },
      { status: 500 }
    );
  }
}
