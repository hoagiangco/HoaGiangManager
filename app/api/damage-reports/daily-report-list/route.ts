import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';
import { DamageReportPriority } from '@/types';

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

    const targetDate = dateParam ? new Date(dateParam) : new Date(); // kept for any display usage

    // Use date string directly for getDailyReportData to avoid UTC timezone shift
    let targetDateStr: string;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      targetDateStr = dateParam;
    } else {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      targetDateStr = `${y}-${m}-${d}`;
    }

    const damageReportService = new DamageReportService();
    const data = await damageReportService.getDailyReportData(targetDateStr, {
      departmentId: departmentId > 0 ? departmentId : undefined,
      handlerId: staffId > 0 ? staffId : undefined
    });

    // Flatten and tag reports
    let reports: any[] = [];

    // Tag each report with its daily category
    const taggedNew = data.newReports.map(r => ({ ...r, dailyCategory: 'Chưa làm' }));
    const taggedActive = data.activeReports.map(r => ({ ...r, dailyCategory: 'Đang xử lý' }));
    const taggedCompleted = data.completedReports.map(r => ({ ...r, dailyCategory: 'Hoàn thành' }));
    const taggedPending = data.pendingReports.map(r => ({ ...r, dailyCategory: 'Tồn đọng' }));

    // Combine all
    reports = [...taggedNew, ...taggedActive, ...taggedCompleted, ...taggedPending];

    // Remove duplicates (a report might be New and Active if checked in today)
    const seenIds = new Set();
    reports = reports.filter(r => {
      if (seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      return true;
    });

    // Apply category filtering if requested
    if (category !== 'all') {
      if (category === 'new') {
        reports = reports.filter(r => r.dailyCategory === 'Chưa làm');
      } else if (category === 'active') {
        reports = reports.filter(r => r.dailyCategory === 'Đang xử lý');
      } else if (category === 'completed') {
        reports = reports.filter(r => r.dailyCategory === 'Hoàn thành');
      } else if (category === 'backlog') {
        reports = reports.filter(r => r.dailyCategory === 'Tồn đọng');
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
