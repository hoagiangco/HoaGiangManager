import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';
import { DamageReportStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const damageReportService = new DamageReportService();
    
    // Check if user is admin
    const isAdmin = user.roles && user.roles.includes('Admin');
    
    // Get all pending and in-progress reports
    const filters = {
      currentUserId: user.userId,
      isAdmin: isAdmin
    };

    // Get pending reports (status = Pending or Assigned)
    const pendingFilters = { ...filters };
    const allReports = await damageReportService.getAll(pendingFilters);
    
    // Filter for pending reports (Pending or Assigned)
    const pendingReports = allReports.filter(
      report => report.status === DamageReportStatus.Pending || 
                report.status === DamageReportStatus.Assigned
    );

    // Filter for in-progress reports
    const inProgressReports = allReports.filter(
      report => report.status === DamageReportStatus.InProgress
    );

    // Group pending reports by handler
    const pendingGroupedByHandler: Record<number, {
      handlerId: number;
      handlerName: string;
      count: number;
    }> = {};

    let pendingUnassignedCount = 0;

    pendingReports.forEach(report => {
      if (!report.handlerId) {
        pendingUnassignedCount++;
      } else {
        if (!pendingGroupedByHandler[report.handlerId]) {
          pendingGroupedByHandler[report.handlerId] = {
            handlerId: report.handlerId,
            handlerName: report.handlerName || 'Không xác định',
            count: 0,
          };
        }
        pendingGroupedByHandler[report.handlerId].count++;
      }
    });

    // Group in-progress reports by handler
    const inProgressGroupedByHandler: Record<number, {
      handlerId: number;
      handlerName: string;
      count: number;
    }> = {};

    let inProgressUnassignedCount = 0;

    inProgressReports.forEach(report => {
      if (!report.handlerId) {
        inProgressUnassignedCount++;
      } else {
        if (!inProgressGroupedByHandler[report.handlerId]) {
          inProgressGroupedByHandler[report.handlerId] = {
            handlerId: report.handlerId,
            handlerName: report.handlerName || 'Không xác định',
            count: 0,
          };
        }
        inProgressGroupedByHandler[report.handlerId].count++;
      }
    });

    const pendingHandlers = Object.values(pendingGroupedByHandler);
    const inProgressHandlers = Object.values(inProgressGroupedByHandler);

    return NextResponse.json({
      status: true,
      data: {
        pending: {
          totalCount: pendingReports.length,
          unassignedCount: pendingUnassignedCount,
          handlers: pendingHandlers,
        },
        inProgress: {
          totalCount: inProgressReports.length,
          unassignedCount: inProgressUnassignedCount,
          handlers: inProgressHandlers,
        },
      },
    });
  } catch (error: any) {
    console.error('Get pending reports error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi lấy danh sách báo cáo chờ xử lý',
      },
      { status: 500 }
    );
  }
}

