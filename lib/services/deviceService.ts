import pool from '../db';
import { Device, DeviceVM, DeviceStatus, DamageReportStatus, DamageReportPriority, DeviceHistorySummary, DeviceHistoryReport, DeviceHistoryEntry } from '@/types';

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

  async create(device: Omit<Device, 'id'>): Promise<number> {
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
        device.status || DeviceStatus.DangSuDung
      ]
    );

    return result.rows[0].ID;
  }

  async update(device: Device): Promise<number> {
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
        device.status,
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
          dr."DamageLocation" as "damageLocation",
          dr."DamageContent" as "damageContent",
          dr."ReportDate" as "reportDate",
          dr."Status" as "status",
          dr."Priority" as "priority",
          COALESCE(dr."DamageLocation", d."Name") as "displayLocation",
          reporter."Name" as "reporterName",
          handler."Name" as "handlerName"
        FROM "DamageReport" dr
        LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
        LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
        LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
        WHERE dr."DeviceID" = $1
        ORDER BY dr."ReportDate" DESC, dr."ID" DESC
        `,
        [deviceId]
      );

      if (!reportsResult.rows || reportsResult.rows.length === 0) {
        return {
          deviceId,
          deviceName: deviceRow?.Name || deviceRow?.name || null,
          deviceSerial: deviceRow?.Serial || deviceRow?.serial || null,
          totalReports: 0,
          totalHistory: 0,
          reports: [],
        };
      }

      const reportMap = new Map<number, DeviceHistoryReport>();
      const reportIds: number[] = [];

      for (const row of reportsResult.rows) {
        const reportId: number = row.id ?? row.ID;
        if (!reportId) {
          continue;
        }
        reportIds.push(reportId);

        const rawStatus = row.status ?? row.Status ?? '';
        const statusNumber = parseInt(rawStatus, 10);
        const statusEnum: DamageReportStatus = Number.isNaN(statusNumber)
          ? DamageReportStatus.Pending
          : (statusNumber as DamageReportStatus);

        const rawPriority = row.priority ?? row.Priority ?? '';
        const priorityNumber = parseInt(rawPriority, 10);
        const priorityEnum: DamageReportPriority = Number.isNaN(priorityNumber)
          ? DamageReportPriority.Normal
          : (priorityNumber as DamageReportPriority);

        const reportDateValue = row.reportDate ?? row.ReportDate ?? null;
        const reportDateIso = reportDateValue
          ? new Date(reportDateValue).toISOString()
          : null;

        const reportData: DeviceHistoryReport = {
          reportId,
          displayLocation: row.displayLocation ?? row.damageLocation ?? row.damageContent ?? null,
          damageContent: row.damageContent ?? null,
          reportDate: reportDateIso,
          status: statusEnum,
          statusName: this.getDamageReportStatusName(statusEnum),
          priority: priorityEnum,
          priorityName: this.getDamageReportPriorityName(priorityEnum),
          handlerName: row.handlerName ?? null,
          reporterName: row.reporterName ?? null,
          histories: [],
        };

        reportMap.set(reportId, reportData);
      }

      let totalHistory = 0;

      if (reportIds.length > 0) {
        const historyResult = await client.query(
          `
          SELECT
            h."ID" as "id",
            h."DamageReportID" as "damageReportId",
            h."FieldName" as "fieldName",
            h."OldValue" as "oldValue",
            h."NewValue" as "newValue",
            h."ChangedBy" as "changedBy",
            h."ChangedAt" as "changedAt",
            staff."Name" as "staffName",
            users."FullName" as "userFullName"
          FROM "DamageReportHistory" h
          LEFT JOIN "Staff" staff ON staff."UserId" = h."ChangedBy"
          LEFT JOIN "AspNetUsers" users ON users."Id" = h."ChangedBy"
          WHERE h."DamageReportID" = ANY($1::int[])
          ORDER BY h."ChangedAt" DESC, h."ID" DESC
          `,
          [reportIds]
        );

        for (const row of historyResult.rows as any[]) {
          const reportId: number = row.damageReportId ?? row.DamageReportID;
          const report = reportMap.get(reportId);
          if (!report) {
            continue;
          }

          const fieldName: string = row.fieldName ?? row.FieldName ?? '';
          const changedAtRaw = row.changedAt ?? row.ChangedAt ?? null;
          const changedAtIso = changedAtRaw
            ? new Date(changedAtRaw).toISOString()
            : new Date().toISOString();

          const entry: DeviceHistoryEntry = {
            id: row.id ?? row.ID,
            damageReportId: reportId,
            fieldName,
            fieldLabel: this.getHistoryFieldLabel(fieldName),
            oldValue: this.formatHistoryValue(fieldName, row.oldValue ?? row.OldValue ?? null),
            newValue: this.formatHistoryValue(fieldName, row.newValue ?? row.NewValue ?? null),
            changedBy: row.changedBy ?? row.ChangedBy ?? null,
            changedByName: row.staffName ?? row.userFullName ?? row.changedBy ?? row.ChangedBy ?? null,
            changedAt: changedAtIso,
          };

          report.histories.push(entry);
          totalHistory += 1;
        }
      }

      return {
        deviceId,
        deviceName: deviceRow?.Name || deviceRow?.name || null,
        deviceSerial: deviceRow?.Serial || deviceRow?.serial || null,
        totalReports: reportMap.size,
        totalHistory,
        reports: Array.from(reportMap.values()),
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

  private getDamageReportPriorityName(priority: DamageReportPriority): string {
    switch (priority) {
      case DamageReportPriority.Low:
        return 'Thấp';
      case DamageReportPriority.Normal:
        return 'Bình thường';
      case DamageReportPriority.High:
        return 'Cao';
      case DamageReportPriority.Urgent:
        return 'Khẩn cấp';
      default:
        return 'Không xác định';
    }
  }

  private getHistoryFieldLabel(fieldName: string): string {
    switch (fieldName) {
      case 'Status':
        return 'Trạng thái';
      case 'Priority':
        return 'Mức ưu tiên';
      case 'HandlerNotes':
        return 'Ghi chú người xử lý';
      default:
        return fieldName || 'Không xác định';
    }
  }

  private formatHistoryValue(fieldName: string, value: string | null): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    switch (fieldName) {
      case 'Status': {
        const numeric = parseInt(value, 10);
        if (Number.isNaN(numeric)) {
          return value;
        }
        return this.getDamageReportStatusName(numeric as DamageReportStatus);
      }
      case 'Priority': {
        const numeric = parseInt(value, 10);
        if (Number.isNaN(numeric)) {
          return value;
        }
        return this.getDamageReportPriorityName(numeric as DamageReportPriority);
      }
      case 'HandlerNotes':
        return value;
      default:
        return value;
    }
  }
}

