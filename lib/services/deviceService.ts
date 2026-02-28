import {
  Device,
  DeviceVM,
  DeviceStatus,
  DamageReportStatus,
  DeviceHistorySummary,
  DeviceHistoryReport,
  DeviceHistoryEvent,
  EventStatus,
} from '@/types';
import pool from '../db';
import { PoolClient } from 'pg';

export class DeviceService {
  async getDeviceByCategory(categoryId: number = 0): Promise<DeviceVM[]> {
    try {
      let query = `
        SELECT 
          d."ID" as id,
          d."Name" as name,
          d."Serial" as serial,
          d."Description" as description,
          d."Img" as img,
          d."WarrantyDate" as "warrantyDate",
          d."UseDate" as "useDate",
          d."EndDate" as "endDate",
          d."DepartmentID" as "departmentId",
          dep."Name" as "departmentName",
          d."DeviceCategoryID" as "deviceCategoryId",
          dc."Name" as "deviceCategoryName",
          CAST(d."Status"::text AS INTEGER) as status
        FROM "Device" d
        INNER JOIN "DeviceCategory" dc ON d."DeviceCategoryID" = dc."ID"
        INNER JOIN "Department" dep ON d."DepartmentID" = dep."ID"
      `;

      const params: any[] = [];
      if (categoryId > 0) {
        query += ` WHERE d."DeviceCategoryID" = $1`;
        params.push(categoryId);
      }

      query += ` ORDER BY d."Name"`;

      const result = await pool.query(query, params);

      // Return empty array if no devices, otherwise map the results
      if (!result.rows || result.rows.length === 0) {
        return [];
      }

      return result.rows.map((row: any) => ({
        ...row,
        status: row.status ? parseInt(row.status) as DeviceStatus : DeviceStatus.DangSuDung,
        statusName: this.getStatusName(row.status ? parseInt(row.status) : DeviceStatus.DangSuDung)
      }));
    } catch (error: any) {
      console.error('DeviceService.getDeviceByCategory error:', error);
      throw error;
    }
  }

  async getDevicesByIds(deviceIds: number[]): Promise<DeviceVM[]> {
    try {
      if (!deviceIds || deviceIds.length === 0) {
        return [];
      }

      const placeholders = deviceIds.map((_, index) => `$${index + 1}`).join(',');
      const query = `
        SELECT 
          d."ID" as id,
          d."Name" as name,
          d."Serial" as serial,
          d."Description" as description,
          d."Img" as img,
          d."WarrantyDate" as "warrantyDate",
          d."UseDate" as "useDate",
          d."EndDate" as "endDate",
          d."DepartmentID" as "departmentId",
          dep."Name" as "departmentName",
          d."DeviceCategoryID" as "deviceCategoryId",
          dc."Name" as "deviceCategoryName",
          CAST(d."Status"::text AS INTEGER) as status
        FROM "Device" d
        INNER JOIN "DeviceCategory" dc ON d."DeviceCategoryID" = dc."ID"
        INNER JOIN "Department" dep ON d."DepartmentID" = dep."ID"
        WHERE d."ID" IN (${placeholders})
        ORDER BY d."Name"
      `;

      const result = await pool.query(query, deviceIds);

      if (!result.rows || result.rows.length === 0) {
        return [];
      }

      return result.rows.map((row: any) => ({
        ...row,
        status: row.status ? parseInt(row.status) as DeviceStatus : DeviceStatus.DangSuDung,
        statusName: this.getStatusName(row.status ? parseInt(row.status) : DeviceStatus.DangSuDung)
      }));
    } catch (error: any) {
      console.error('DeviceService.getDevicesByIds error:', error);
      throw error;
    }
  }

  async getDevicesByDepartment(departmentId: number): Promise<DeviceVM[]> {
    try {
      if (!departmentId || departmentId <= 0) {
        return [];
      }

      const query = `
        SELECT 
          d."ID" as id,
          d."Name" as name,
          d."Serial" as serial,
          d."Description" as description,
          d."Img" as img,
          d."WarrantyDate" as "warrantyDate",
          d."UseDate" as "useDate",
          d."EndDate" as "endDate",
          d."DepartmentID" as "departmentId",
          dep."Name" as "departmentName",
          d."DeviceCategoryID" as "deviceCategoryId",
          dc."Name" as "deviceCategoryName",
          CAST(d."Status"::text AS INTEGER) as status
        FROM "Device" d
        INNER JOIN "DeviceCategory" dc ON d."DeviceCategoryID" = dc."ID"
        INNER JOIN "Department" dep ON d."DepartmentID" = dep."ID"
        WHERE d."DepartmentID" = $1
        ORDER BY d."Name"
      `;

      const result = await pool.query(query, [departmentId]);

      if (!result.rows || result.rows.length === 0) {
        return [];
      }

      return result.rows.map((row: any) => ({
        ...row,
        status: row.status ? parseInt(row.status) as DeviceStatus : DeviceStatus.DangSuDung,
        statusName: this.getStatusName(row.status ? parseInt(row.status) : DeviceStatus.DangSuDung)
      }));
    } catch (error: any) {
      console.error('DeviceService.getDevicesByDepartment error:', error);
      throw error;
    }
  }

  async getById(id: number): Promise<Device | null> {
    const result = await pool.query(
      `SELECT * FROM "Device" WHERE "ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.ID,
      name: row.Name,
      serial: row.Serial,
      description: row.Description,
      img: row.Img,
      warrantyDate: row.WarrantyDate,
      useDate: row.UseDate,
      endDate: row.EndDate,
      departmentId: row.DepartmentID,
      deviceCategoryId: row.DeviceCategoryID,
      status: row.Status ? (typeof row.Status === 'string' ? parseInt(row.Status) : row.Status) as DeviceStatus : DeviceStatus.DangSuDung
    };
  }

  private async ensureDeviceSequence(client?: PoolClient): Promise<void> {
    const executor = client || pool;
    const maxRes = await executor.query(
      'SELECT COALESCE(MAX("ID"), 0) AS max_id FROM "Device"'
    );
    const seqRes = await executor.query(
      'SELECT last_value, is_called FROM "Device_ID_seq"'
    );

    const maxId = Number(maxRes.rows[0]?.max_id || 0);
    let seqValue = Number(seqRes.rows[0]?.last_value || 0);
    const isCalled = seqRes.rows[0]?.is_called ?? false;

    if (!isCalled) {
      seqValue -= 1;
    }

    if (maxId > seqValue) {
      await executor.query(
        'SELECT setval(pg_get_serial_sequence(\'"Device"\', \'ID\'), $1, true)',
        [maxId]
      );
    }
  }

  async create(device: Omit<Device, 'id'>): Promise<number> {
    await this.ensureDeviceSequence();

    const result = await pool.query(
      `INSERT INTO "Device" (
        "Name", "Serial", "Description", "Img", "WarrantyDate", 
        "UseDate", "EndDate", "DepartmentID", "DeviceCategoryID", "Status"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING "ID"`,
      [
        device.name,
        device.serial || null,
        device.description || null,
        device.img || null,
        device.warrantyDate || null,
        device.useDate || null,
        device.endDate || null,
        device.departmentId,
        device.deviceCategoryId,
        (device.status ?? DeviceStatus.DangSuDung).toString()
      ]
    );

    return result.rows[0].ID;
  }

  async update(device: Device): Promise<number> {
    await this.ensureDeviceSequence();

    await pool.query(
      `UPDATE "Device" SET
        "Name" = $1,
        "Serial" = $2,
        "Description" = $3,
        "Img" = $4,
        "WarrantyDate" = $5,
        "UseDate" = $6,
        "EndDate" = $7,
        "DepartmentID" = $8,
        "DeviceCategoryID" = $9,
        "Status" = $10
      WHERE "ID" = $11`,
      [
        device.name,
        device.serial || null,
        device.description || null,
        device.img || null,
        device.warrantyDate || null,
        device.useDate || null,
        device.endDate || null,
        device.departmentId,
        device.deviceCategoryId,
        (device.status ?? DeviceStatus.DangSuDung).toString(),
        device.id
      ]
    );

    return device.id;
  }

  async delete(id: number): Promise<boolean> {
    // Check if device is used in events
    const eventCheck = await pool.query(
      'SELECT "ID" FROM "Event" WHERE "DeviceID" = $1 LIMIT 1',
      [id]
    );

    if (eventCheck.rows.length > 0) {
      return false; // Cannot delete if used in events
    }

    await pool.query('DELETE FROM "Device" WHERE "ID" = $1', [id]);
    return true;
  }

  async getDamageHistory(deviceId: number): Promise<DeviceHistorySummary> {
    const client = await pool.connect();
    try {
      const deviceResult = await client.query(
        `SELECT "Name", "Serial" FROM "Device" WHERE "ID" = $1`,
        [deviceId]
      );
      const deviceRow = deviceResult.rows[0] || null;

      const reportsResult = await client.query(
        `
        SELECT
          dr."ID" as "id",
          dr."ReportDate" as "reportDate",
          dr."CompletedDate" as "completedDate",
          dr."Status" as "status"
        FROM "DamageReport" dr
        WHERE dr."DeviceID" = $1
        ORDER BY dr."ReportDate" DESC, dr."ID" DESC
        `,
        [deviceId]
      );

      const reportMap = new Map<number, DeviceHistoryReport>();

      for (const row of reportsResult.rows) {
        const reportId: number = row.id ?? row.ID;
        if (!reportId) {
          continue;
        }

        const rawStatus = row.status ?? row.Status ?? '';
        const statusNumber = parseInt(String(rawStatus), 10);
        const statusEnum: DamageReportStatus = Number.isNaN(statusNumber)
          ? DamageReportStatus.Pending
          : (statusNumber as DamageReportStatus);

        const reportDateIso = this.toIsoString(row.reportDate ?? row.ReportDate ?? null);
        const completedDateIso = this.toIsoString(row.completedDate ?? row.CompletedDate ?? null);

        reportMap.set(reportId, {
          reportId,
          reportDate: reportDateIso,
          completedDate: completedDateIso,
          status: statusEnum,
          statusName: this.getDamageReportStatusName(statusEnum),
          eventTypeName: null,
          eventTypeCode: null,
        });
      }

      const eventsResult = await client.query(
        `
        SELECT
          e."ID" as "id",
          e."Title" as "title",
          e."EventTypeID" as "eventTypeId",
          et."Name" as "eventTypeName",
          et."Code" as "eventTypeCode",
          et."Category" as "eventTypeCategory",
          e."Status" as "status",
          e."EventDate" as "eventDate",
          e."EndDate" as "endDate",
          e."CreatedAt" as "createdAt",
          e."RelatedReportID" as "relatedReportId",
          dr."ReportDate" as "reportDate",
          dr."CompletedDate" as "reportCompletedDate",
          dr."Status" as "reportStatus"
        FROM "Event" e
        LEFT JOIN "EventType" et ON e."EventTypeID" = et."ID"
        LEFT JOIN "DamageReport" dr ON e."RelatedReportID" = dr."ID"
        WHERE e."DeviceID" = $1
        ORDER BY COALESCE(dr."ReportDate", e."EventDate", e."CreatedAt") DESC NULLS LAST, e."ID" DESC
        `,
        [deviceId]
      );

      const events: DeviceHistoryEvent[] = [];

      for (const row of eventsResult.rows) {
        const statusValue = this.normalizeEventStatus(row.status ?? row.Status ?? EventStatus.Completed);
        const eventDateIso = this.toIsoString(row.eventDate ?? row.EventDate ?? null);
        const reportedAtIso =
          this.toIsoString(row.reportDate ?? row.ReportDate ?? null) || eventDateIso;
        const completedAtIso =
          this.toIsoString(row.reportCompletedDate ?? row.reportcompleteddate ?? null) ||
          this.toIsoString(row.endDate ?? row.EndDate ?? null) ||
          eventDateIso;

        let reportStatusEnum: DamageReportStatus | null = null;
        const rawReportStatus = row.reportStatus ?? row.ReportStatus ?? null;
        if (rawReportStatus !== null && rawReportStatus !== undefined) {
          const parsed = parseInt(String(rawReportStatus), 10);
          if (!Number.isNaN(parsed)) {
            reportStatusEnum = parsed as DamageReportStatus;
          }
        }

        const eventSummary: DeviceHistoryEvent = {
          id: row.id ?? row.ID,
          title: row.title ?? row.Title ?? null,
          eventTypeName: row.eventTypeName ?? row.EventTypeName ?? null,
          eventTypeCode: row.eventTypeCode ?? row.EventTypeCode ?? null,
          eventTypeCategory: row.eventTypeCategory ?? row.EventTypeCategory ?? null,
          status: statusValue,
          statusLabel: this.getEventStatusLabel(statusValue),
          eventDate: eventDateIso,
          reportedAt: reportedAtIso,
          completedAt: completedAtIso,
          relatedReportId: row.relatedReportId ?? row.RelatedReportID ?? null,
          reportStatus: reportStatusEnum,
          reportStatusName: reportStatusEnum !== null ? this.getDamageReportStatusName(reportStatusEnum) : null,
        };

        events.push(eventSummary);

        if (eventSummary.relatedReportId) {
          const report = reportMap.get(eventSummary.relatedReportId);
          if (report) {
            if (eventSummary.eventTypeName) {
              report.eventTypeName = eventSummary.eventTypeName;
              report.eventTypeCode = eventSummary.eventTypeCode ?? null;
            }
            if (!report.completedDate && completedAtIso) {
              report.completedDate = completedAtIso;
            }
            if (eventSummary.reportStatus !== null && eventSummary.reportStatus !== undefined) {
              report.status = eventSummary.reportStatus;
              report.statusName = this.getDamageReportStatusName(eventSummary.reportStatus);
            }
          }
        }
      }

      return {
        deviceId,
        deviceName: deviceRow?.Name || deviceRow?.name || null,
        deviceSerial: deviceRow?.Serial || deviceRow?.serial || null,
        totalReports: reportMap.size,
        totalEvents: events.length,
        reports: Array.from(reportMap.values()),
        events,
      };
    } catch (error: any) {
      console.error('DeviceService.getDamageHistory error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private getStatusName(status: DeviceStatus): string {
    switch (status) {
      case DeviceStatus.DangSuDung:
        return 'Đang sử dụng';
      case DeviceStatus.DangSuaChua:
        return 'Đang sửa chữa';
      case DeviceStatus.HuHong:
        return 'Hư hỏng không dùng được';
      case DeviceStatus.DaThanhLy:
        return 'Đã thanh lý';
      default:
        return 'Không xác định';
    }
  }

  private getDamageReportStatusName(status: DamageReportStatus): string {
    switch (status) {
      case DamageReportStatus.Pending:
        return 'Chờ xử lý';
      case DamageReportStatus.Assigned:
        return 'Đã phân công';
      case DamageReportStatus.InProgress:
        return 'Đang xử lý';
      case DamageReportStatus.Completed:
        return 'Hoàn thành';
      case DamageReportStatus.Cancelled:
        return 'Đã hủy';
      case DamageReportStatus.Rejected:
        return 'Từ chối';
      default:
        return 'Không xác định';
    }
  }

  private normalizeEventStatus(value: any): EventStatus {
    const normalized = String(value || '').toLowerCase();
    switch (normalized) {
      case EventStatus.Planned:
        return EventStatus.Planned;
      case EventStatus.InProgress:
      case 'inprogress':
      case 'in-progress':
        return EventStatus.InProgress;
      case EventStatus.Cancelled:
        return EventStatus.Cancelled;
      case EventStatus.Missed:
        return EventStatus.Missed;
      case EventStatus.Completed:
      default:
        return EventStatus.Completed;
    }
  }

  private getEventStatusLabel(status: EventStatus): string {
    switch (status) {
      case EventStatus.Planned:
        return 'Đã lên kế hoạch';
      case EventStatus.InProgress:
        return 'Đang thực hiện';
      case EventStatus.Cancelled:
        return 'Đã hủy';
      case EventStatus.Missed:
        return 'Bỏ lỡ';
      case EventStatus.Completed:
      default:
        return 'Hoàn thành';
    }
  }

  private toIsoString(value: any): string | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }
}

