import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import { DamageReportService } from '@/lib/services/damageReportService';
import { DamageReportStatus, DamageReportPriority } from '@/types';

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
    const filters: any = {};

    const status = searchParams.get('status');
    if (status) {
      filters.status = parseInt(status) as DamageReportStatus;
    }

    const priority = searchParams.get('priority');
    if (priority) {
      filters.priority = parseInt(priority) as DamageReportPriority;
    }

    const deviceId = searchParams.get('deviceId');
    if (deviceId) {
      filters.deviceId = parseInt(deviceId);
    }

    const reporterId = searchParams.get('reporterId');
    if (reporterId) {
      filters.reporterId = parseInt(reporterId);
    }

    const handlerId = searchParams.get('handlerId');
    if (handlerId) {
      filters.handlerId = parseInt(handlerId);
    }

    const departmentId = searchParams.get('departmentId');
    if (departmentId) {
      filters.departmentId = parseInt(departmentId);
    }

    const search = searchParams.get('search');
    if (search) {
      filters.search = search;
    }

    const damageReportService = new DamageReportService();
    
    // Check if user is admin
    const isAdmin = user.roles && user.roles.includes('Admin');
    
    // Add currentUserId and isAdmin to filters
    const filtersWithUser = {
      ...filters,
      currentUserId: user.userId,
      isAdmin: isAdmin
    };
    
    const reports = await damageReportService.getAll(filtersWithUser);

    return NextResponse.json({
      status: true,
      data: reports
    });
  } catch (error: any) {
    console.error('Get damage reports error:', error);
    return NextResponse.json(
      { status: false, error: 'Đã xảy ra lỗi' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);
    
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const reportData = await request.json();
    
    // Set default values
    if (!reportData.reportDate) {
      reportData.reportDate = new Date().toISOString().split('T')[0];
    }
    if (!reportData.status) {
      reportData.status = DamageReportStatus.Pending;
    }
    if (!reportData.priority) {
      reportData.priority = DamageReportPriority.Normal;
    }
    if (reportData.createdBy === undefined) {
      reportData.createdBy = user.userId;
    }

    const damageReportService = new DamageReportService();
    const id = await damageReportService.create(reportData);

    return NextResponse.json({
      status: id > 0,
      data: { id }
    });
  } catch (error: any) {
    console.error('Create damage report error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Đã xảy ra lỗi khi tạo báo cáo hư hỏng' },
      { status: 500 }
    );
  }
}

