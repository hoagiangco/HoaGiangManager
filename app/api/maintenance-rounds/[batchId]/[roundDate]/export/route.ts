import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { formatDateDisplay } from '@/lib/utils/dateFormat';

// Helper function to parse date safely
function parseDateSafe(dateStr: string): Date | null {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string; roundDate: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdminUser = user.roles && user.roles.includes('Admin');
    if (!isAdminUser) {
      return NextResponse.json(
        { status: false, error: 'Chỉ admin mới có quyền xuất Excel' },
        { status: 403 }
      );
    }

    const { batchId, roundDate } = params;

    if (!batchId || !roundDate) {
      return NextResponse.json(
        { status: false, error: 'BatchId và RoundDate là bắt buộc' },
        { status: 400 }
      );
    }

    // Parse roundDate - ensure it's in YYYY-MM-DD format
    // If already in YYYY-MM-DD format, use it directly
    let roundDateFormatted = roundDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(roundDate)) {
      // If not in YYYY-MM-DD format, try to parse and format
      try {
        const roundDateObj = new Date(roundDate);
        if (isNaN(roundDateObj.getTime())) {
          return NextResponse.json(
            { status: false, error: 'RoundDate không hợp lệ' },
            { status: 400 }
          );
        }
        // Format as YYYY-MM-DD (use local date, not UTC)
        const year = roundDateObj.getFullYear();
        const month = String(roundDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(roundDateObj.getDate()).padStart(2, '0');
        roundDateFormatted = `${year}-${month}-${day}`;
      } catch (error) {
        return NextResponse.json(
          { status: false, error: 'RoundDate không hợp lệ' },
          { status: 400 }
        );
      }
    }

    // Get all events for this batch and round date
    // Use COALESCE to get the round date (endDate > eventDate > startDate)
    const result = await pool.query(
      `
      SELECT 
        e."ID" as id,
        e."Title" as title,
        e."DeviceID" as "deviceId",
        d."Name" as "deviceName",
        d."Serial" as "deviceSerial",
        e."EventTypeID" as "eventTypeId",
        et."Name" as "eventTypeName",
        e."Description" as description,
        e."Status" as status,
        e."EventDate" as "eventDate",
        e."StartDate" as "startDate",
        e."EndDate" as "endDate",
        e."StaffID" as "staffId",
        s."Name" as "staffName",
        e."RelatedReportID" as "relatedReportId",
        e."Notes" as notes,
        e."Metadata" as metadata
      FROM "Event" e
      LEFT JOIN "Device" d ON e."DeviceID" = d."ID"
      LEFT JOIN "EventType" et ON e."EventTypeID" = et."ID"
      LEFT JOIN "Staff" s ON e."StaffID" = s."ID"
      WHERE e."Metadata"::text LIKE $1
        AND (
          (e."EndDate" IS NOT NULL AND e."EndDate" >= $2::timestamp AND e."EndDate" <= $3::timestamp)
          OR (e."EventDate" IS NOT NULL AND e."EventDate" >= $2::timestamp AND e."EventDate" <= $3::timestamp)
          OR (e."StartDate" IS NOT NULL AND e."StartDate" >= $2::timestamp AND e."StartDate" <= $3::timestamp)
        )
      ORDER BY d."Name", e."ID"
      `,
      [`%${batchId}%`, `${roundDateFormatted}T00:00:00.000Z`, `${roundDateFormatted}T23:59:59.999Z`]
    );

    const events = result.rows
      .map((row: any) => {
        let metadata: Record<string, any> | null = null;
        if (row.metadata) {
          if (typeof row.metadata === 'string') {
            try {
              metadata = JSON.parse(row.metadata);
            } catch (error) {
              metadata = null;
            }
          } else {
            metadata = row.metadata;
          }
        }

        if (!metadata || metadata.maintenanceBatchId !== batchId) {
          return null;
        }

        return {
          id: row.id,
          title: row.title,
          deviceName: row.deviceName || 'N/A',
          deviceSerial: row.deviceSerial || '',
          eventTypeName: row.eventTypeName || 'N/A',
          status: row.status,
          eventDate: row.eventDate ? new Date(row.eventDate).toISOString().split('T')[0] : null,
          startDate: row.startDate ? new Date(row.startDate).toISOString().split('T')[0] : null,
          endDate: row.endDate ? new Date(row.endDate).toISOString().split('T')[0] : null,
          staffName: row.staffName || 'N/A',
          relatedReportId: row.relatedReportId,
          notes: row.notes || '',
          maintenanceType: metadata.maintenanceType || null,
          maintenanceProvider: metadata.maintenanceProvider || null,
        };
      })
      .filter((event: any) => event !== null) as any[];

    if (events.length === 0) {
      return NextResponse.json(
        { status: false, error: 'Không có dữ liệu để xuất' },
        { status: 400 }
      );
    }

    // Get batch title from first event
    const batchTitle = events[0]!.title || `Bảo trì - ${batchId}`;
    const maintenanceType = events[0]!.maintenanceType;
    const maintenanceProvider = events[0]!.maintenanceProvider;

    // Generate Excel
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Báo cáo đợt bảo trì');

    // Title
    const titleRow = worksheet.addRow([`BÁO CÁO ĐỢT BẢO TRÌ`]);
    titleRow.font = { bold: true, size: 16 };
    titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.mergeCells(1, 1, 1, 7);

    // Batch info
    worksheet.addRow([`Kế hoạch: ${batchTitle}`]);
    worksheet.addRow([`Batch ID: ${batchId}`]);
    worksheet.addRow([`Ngày bảo trì: ${formatDateDisplay(roundDate)}`]);
    if (maintenanceType) {
      worksheet.addRow([`Loại bảo trì: ${maintenanceType === 'outsource' ? 'Thuê ngoài' : 'Nội bộ'}`]);
      if (maintenanceType === 'outsource' && maintenanceProvider) {
        worksheet.addRow([`Nhà cung cấp: ${maintenanceProvider}`]);
      }
    }
    worksheet.addRow(['']); // Empty row

    // Headers
    const headers = ['STT', 'Tên Thiết Bị', 'Serial', 'Loại Sự Kiện', 'Ngày Bảo Trì', 'Nhân Viên', 'Kết Quả', 'Ghi Chú', 'Báo Cáo CV'];
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Data rows
    events.forEach((event, index) => {
      const statusText = event.status === 'completed' ? 'Hoàn thành' : 
                        event.status === 'in_progress' ? 'Đang thực hiện' :
                        event.status === 'planned' ? 'Kế hoạch' : 'Khác';
      
      const reportLink = event.relatedReportId ? `CV-${event.relatedReportId}` : '-';
      const maintenanceDate = event.endDate || event.eventDate || event.startDate || '-';

      worksheet.addRow([
        index + 1,
        event.deviceName,
        event.deviceSerial,
        event.eventTypeName,
        maintenanceDate ? formatDateDisplay(maintenanceDate) : '-',
        event.staffName,
        statusText,
        event.notes,
        reportLink,
      ]);
    });

    // Set column widths
    worksheet.getColumn(1).width = 8;  // STT
    worksheet.getColumn(2).width = 25; // Tên Thiết Bị
    worksheet.getColumn(3).width = 15; // Serial
    worksheet.getColumn(4).width = 20; // Loại Sự Kiện
    worksheet.getColumn(5).width = 15; // Ngày Bảo Trì
    worksheet.getColumn(6).width = 20; // Nhân Viên
    worksheet.getColumn(7).width = 15; // Kết Quả
    worksheet.getColumn(8).width = 30; // Ghi Chú
    worksheet.getColumn(9).width = 15; // Báo Cáo CV

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Return file
    const fileName = `Bao-cao-dot-bao-tri-${batchId}-${roundDate}.xlsx`;
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error: any) {
    console.error('Export maintenance round error:', error);
    return NextResponse.json(
      {
        status: false,
        error: error.message || 'Đã xảy ra lỗi khi xuất báo cáo',
      },
      { status: 500 }
    );
  }
}

