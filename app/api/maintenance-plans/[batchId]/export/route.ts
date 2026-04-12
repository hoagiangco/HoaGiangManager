import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth/middleware';
import pool from '@/lib/db';
import { formatDateDisplay } from '@/lib/utils/dateFormat';
import { generateExcelFile } from '@/lib/utils/excelGenerator.server';

export async function GET(
  request: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const { user, error } = await authenticate(request);
    if (!user) {
      return NextResponse.json(
        { status: false, error: error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { batchId } = params;
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get('preview') === 'true';

    if (!batchId) {
      return NextResponse.json(
        { status: false, error: 'BatchId là bắt buộc' },
        { status: 400 }
      );
    }

    // Get all events for this batchId
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
      ORDER BY COALESCE(e."EndDate", e."EventDate", e."StartDate") DESC, e."ID" ASC
      `,
      [`%${batchId}%`]
    );

    const exportData = result.rows
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

        const maintenanceDate = row.endDate || row.eventDate || row.startDate;

        return {
          'ID': row.id,
          'Ngày bảo trì': formatDateDisplay(maintenanceDate) || '',
          'Tên thiết bị': row.deviceName || 'N/A',
          'Số Serial': row.deviceSerial || '',
          'Loại bảo trì': row.eventTypeName || 'N/A',
          'Nhân viên thực hiện': row.staffName || 'N/A',
          'Trạng thái': row.status === 'completed' ? 'Hoàn thành' : 
                        row.status === 'in_progress' ? 'Đang xử lý' : 
                        row.status === 'planned' ? 'Kế hoạch' : row.status,
          'Kết quả/Ghi chú': row.notes || row.description || '',
          'Mã tham chiếu': row.relatedReportId ? `CV-${row.relatedReportId}` : '-',
          'Nhà cung cấp': metadata.maintenanceProvider || '-',
          'Hình thức': metadata.maintenanceType === 'outsource' ? 'Thuê ngoài' : 'Nội bộ'
        };
      })
      .filter((item: any) => item !== null);

    if (exportData.length === 0) {
      return NextResponse.json(
        { status: false, error: 'Không có dữ liệu lịch sử cho kế hoạch này' },
        { status: 400 }
      );
    }

    if (isPreview) {
      return NextResponse.json({
        status: true,
        data: exportData,
        recordCount: exportData.length
      });
    }

    const fileName = `Lịch_sử_bảo_trì_${batchId}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const headers = Object.keys(exportData[0]);
    const rows = exportData.map(item => Object.values(item));

    const excelBuffer = await generateExcelFile({
      title: `LỊCH SỬ BẢO TRÌ - ${batchId}`,
      department: 'Hệ thống quản lý',
      dateRange: `Ngày xuất: ${formatDateDisplay(new Date())}`,
      headers,
      rows,
      fileName,
    });

    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error: any) {
    console.error('Export maintenance plan history error:', error);
    return NextResponse.json(
      { status: false, error: error.message || 'Lỗi hệ thống' },
      { status: 500 }
    );
  }
}
