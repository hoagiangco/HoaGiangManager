import pool from '../db';
import { DamageReport, DamageReportVM, DamageReportStatus, DamageReportPriority, DeviceStatus } from '@/types';

export class DamageReportService {
  private getStatusName(status: DamageReportStatus): string {
    const labels: { [key: number]: string } = {
      [DamageReportStatus.Pending]: 'Chờ xử lý',
      [DamageReportStatus.Assigned]: 'Đã phân công',
      [DamageReportStatus.InProgress]: 'Đang xử lý',
      [DamageReportStatus.Completed]: 'Hoàn thành',
      [DamageReportStatus.Cancelled]: 'Đã hủy',
      [DamageReportStatus.Rejected]: 'Từ chối',
    };
    return labels[status] || 'Không xác định';
  }

  private getPriorityName(priority: DamageReportPriority): string {
    const labels: { [key: number]: string } = {
      [DamageReportPriority.Low]: 'Thấp',
      [DamageReportPriority.Normal]: 'Bình thường',
      [DamageReportPriority.High]: 'Cao',
      [DamageReportPriority.Urgent]: 'Khẩn cấp',
    };
    return labels[priority] || 'Không xác định';
  }

  async getAll(filters?: {
    status?: DamageReportStatus;
    priority?: DamageReportPriority;
    deviceId?: number;
    reporterId?: number;
    handlerId?: number;
    departmentId?: number;
    search?: string;
    currentUserId?: string; // For filtering by current user's staffId
    isAdmin?: boolean; // If false, only show reports created by current user
  }): Promise<DamageReportVM[]> {
    let query = `
      SELECT 
        dr."ID" as id,
        dr."DeviceID" as "deviceId",
        dr."DamageLocation" as "damageLocation",
        dr."ReporterID" as "reporterId",
        dr."ReportingDepartmentID" as "reportingDepartmentId",
        dr."HandlerID" as "handlerId",
        dr."AssignedDate" as "assignedDate",
        dr."ReportDate" as "reportDate",
        dr."HandlingDate" as "handlingDate",
        dr."CompletedDate" as "completedDate",
        dr."EstimatedCompletionDate" as "estimatedCompletionDate",
        dr."DamageContent" as "damageContent",
        dr."Images" as images,
        CAST(dr."Status"::text AS INTEGER) as status,
        CAST(dr."Priority"::text AS INTEGER) as priority,
        dr."Notes" as notes,
        dr."HandlerNotes" as "handlerNotes",
        dr."RejectionReason" as "rejectionReason",
        dr."CreatedBy" as "createdBy",
        dr."UpdatedBy" as "updatedBy",
        dr."CreatedAt" as "createdAt",
        dr."UpdatedAt" as "updatedAt",
        d."Name" as "deviceName",
        d."Serial" as "deviceSerial",
        CAST(d."Status"::text AS INTEGER) as "deviceStatus",
        reporter."Name" as "reporterName",
        reporter_dept."Name" as "reporterDepartmentName",
        handler."Name" as "handlerName",
        handler_dept."Name" as "handlerDepartmentName",
        updated_user."FullName" as "updatedByName"
      FROM "DamageReport" dr
      LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
      LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
      LEFT JOIN "Department" reporter_dept ON dr."ReportingDepartmentID" = reporter_dept."ID"
      LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
      LEFT JOIN "Department" handler_dept ON handler."DepartmentID" = handler_dept."ID"
      LEFT JOIN "AspNetUsers" updated_user ON dr."UpdatedBy" = updated_user."Id"
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // View permission: Users can view all records. Filtering for "My Work" is handled at the UI level.

    if (filters) {
      if (filters.status) {
        query += ` AND dr."Status" = $${paramIndex}`;
        params.push(filters.status.toString());
        paramIndex++;
      }

      if (filters.priority) {
        query += ` AND dr."Priority" = $${paramIndex}`;
        params.push(filters.priority.toString());
        paramIndex++;
      }

      if (filters.deviceId) {
        query += ` AND dr."DeviceID" = $${paramIndex}`;
        params.push(filters.deviceId);
        paramIndex++;
      }

      if (filters.reporterId) {
        query += ` AND dr."ReporterID" = $${paramIndex}`;
        params.push(filters.reporterId);
        paramIndex++;
      }

      if (filters.handlerId) {
        query += ` AND dr."HandlerID" = $${paramIndex}`;
        params.push(filters.handlerId);
        paramIndex++;
      }

      if (filters.departmentId) {
        query += ` AND dr."ReportingDepartmentID" = $${paramIndex}`;
        params.push(filters.departmentId);
        paramIndex++;
      }

      if (filters.search) {
        query += ` AND (
          dr."DamageContent" ILIKE $${paramIndex} OR
          dr."DamageLocation" ILIKE $${paramIndex} OR
          d."Name" ILIKE $${paramIndex} OR
          reporter."Name" ILIKE $${paramIndex} OR
          handler."Name" ILIKE $${paramIndex}
        )`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }
    }

    query += ` ORDER BY dr."ReportDate" DESC, dr."ID" DESC`;

    const result = await pool.query(query, params);

    return result.rows.map((row: any) => {
      const reportDate = row.reportDate ? new Date(row.reportDate) : new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reportDateOnly = new Date(reportDate);
      reportDateOnly.setHours(0, 0, 0, 0);
      const daysSinceReport = Math.floor((today.getTime() - reportDateOnly.getTime()) / (1000 * 60 * 60 * 24));

      let daysInProgress = 0;
      if (row.handlingDate) {
        const handlingDate = new Date(row.handlingDate);
        handlingDate.setHours(0, 0, 0, 0);
        daysInProgress = Math.floor((today.getTime() - handlingDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      let isOverdue = false;
      if (row.estimatedCompletionDate && row.status !== DamageReportStatus.Completed && row.status !== DamageReportStatus.Cancelled && row.status !== DamageReportStatus.Rejected) {
        const estimatedDate = new Date(row.estimatedCompletionDate);
        estimatedDate.setHours(0, 0, 0, 0);
        isOverdue = today > estimatedDate;
      }

      const status = parseInt(row.status) as DamageReportStatus;
      const priority = parseInt(row.priority) as DamageReportPriority;

      return {
        ...row,
        status,
        priority,
        deviceStatus: row.deviceStatus ? parseInt(row.deviceStatus) as DeviceStatus : undefined,
        images: row.images ? (Array.isArray(row.images) ? row.images : JSON.parse(row.images)) : [],
        statusName: this.getStatusName(status),
        priorityName: this.getPriorityName(priority),
        daysSinceReport,
        daysInProgress,
        isOverdue,
        displayLocation: row.deviceName || row.damageLocation || 'Không xác định',
      } as DamageReportVM;
    });
  }

  async getById(id: number): Promise<DamageReportVM | null> {
    const result = await pool.query(
      `SELECT 
        dr."ID" as id,
        dr."DeviceID" as "deviceId",
        dr."DamageLocation" as "damageLocation",
        dr."ReporterID" as "reporterId",
        dr."ReportingDepartmentID" as "reportingDepartmentId",
        dr."HandlerID" as "handlerId",
        dr."AssignedDate" as "assignedDate",
        dr."ReportDate" as "reportDate",
        dr."HandlingDate" as "handlingDate",
        dr."CompletedDate" as "completedDate",
        dr."EstimatedCompletionDate" as "estimatedCompletionDate",
        dr."DamageContent" as "damageContent",
        dr."Images" as images,
        CAST(dr."Status"::text AS INTEGER) as status,
        CAST(dr."Priority"::text AS INTEGER) as priority,
        dr."Notes" as notes,
        dr."HandlerNotes" as "handlerNotes",
        dr."RejectionReason" as "rejectionReason",
        dr."CreatedBy" as "createdBy",
        dr."UpdatedBy" as "updatedBy",
        dr."CreatedAt" as "createdAt",
        dr."UpdatedAt" as "updatedAt",
        d."Name" as "deviceName",
        d."Serial" as "deviceSerial",
        CAST(d."Status"::text AS INTEGER) as "deviceStatus",
        reporter."Name" as "reporterName",
        reporter_dept."Name" as "reporterDepartmentName",
        handler."Name" as "handlerName",
        handler_dept."Name" as "handlerDepartmentName",
        updated_user."FullName" as "updatedByName"
      FROM "DamageReport" dr
      LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
      LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
      LEFT JOIN "Department" reporter_dept ON dr."ReportingDepartmentID" = reporter_dept."ID"
      LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
      LEFT JOIN "Department" handler_dept ON handler."DepartmentID" = handler_dept."ID"
      LEFT JOIN "AspNetUsers" updated_user ON dr."UpdatedBy" = updated_user."Id"
      WHERE dr."ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const status = parseInt(row.status) as DamageReportStatus;
    const priority = parseInt(row.priority) as DamageReportPriority;

    const reportDate = row.reportDate ? new Date(row.reportDate) : new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const reportDateOnly = new Date(reportDate);
    reportDateOnly.setHours(0, 0, 0, 0);
    const daysSinceReport = Math.floor((today.getTime() - reportDateOnly.getTime()) / (1000 * 60 * 60 * 24));

    let daysInProgress = 0;
    if (row.handlingDate) {
      const handlingDate = new Date(row.handlingDate);
      handlingDate.setHours(0, 0, 0, 0);
      daysInProgress = Math.floor((today.getTime() - handlingDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    let isOverdue = false;
    if (row.estimatedCompletionDate && status !== DamageReportStatus.Completed && status !== DamageReportStatus.Cancelled && status !== DamageReportStatus.Rejected) {
      const estimatedDate = new Date(row.estimatedCompletionDate);
      estimatedDate.setHours(0, 0, 0, 0);
      isOverdue = today > estimatedDate;
    }

    return {
      ...row,
      status,
      priority,
      deviceStatus: row.deviceStatus ? parseInt(row.deviceStatus) as DeviceStatus : undefined,
      images: row.images ? (Array.isArray(row.images) ? row.images : JSON.parse(row.images)) : [],
      statusName: this.getStatusName(status),
      priorityName: this.getPriorityName(priority),
      daysSinceReport,
      daysInProgress,
      isOverdue,
      displayLocation: row.deviceName || row.damageLocation || 'Không xác định',
    } as DamageReportVM;
  }

  async create(report: Omit<DamageReport, 'id'>): Promise<number> {
    // Validate: Must have deviceId OR damageLocation
    if (!report.deviceId && (!report.damageLocation || report.damageLocation.trim() === '')) {
      throw new Error('Phải chọn thiết bị hoặc nhập vị trí hư hỏng');
    }

    const result = await pool.query(
      `INSERT INTO "DamageReport" (
        "DeviceID", "DamageLocation", "ReporterID", "ReportingDepartmentID",
        "HandlerID", "AssignedDate", "ReportDate", "HandlingDate", "CompletedDate",
        "EstimatedCompletionDate", "DamageContent", "Images", "Status", "Priority",
        "Notes", "HandlerNotes", "RejectionReason", "CreatedBy", "UpdatedBy"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING "ID"`,
      [
        report.deviceId || null,
        report.damageLocation || null,
        report.reporterId,
        report.reportingDepartmentId,
        report.handlerId || null,
        report.assignedDate || null,
        report.reportDate || new Date(),
        report.handlingDate || null,
        report.completedDate || null,
        report.estimatedCompletionDate || null,
        report.damageContent,
        report.images ? JSON.stringify(report.images) : null,
        report.status.toString(),
        report.priority.toString(),
        report.notes || null,
        report.handlerNotes || null,
        report.rejectionReason || null,
        report.createdBy || null,
        report.updatedBy || null,
      ]
    );

    return result.rows[0].ID;
  }

  async update(report: DamageReport): Promise<number> {
    // Validate: Must have deviceId OR damageLocation
    if (!report.deviceId && (!report.damageLocation || report.damageLocation.trim() === '')) {
      throw new Error('Phải chọn thiết bị hoặc nhập vị trí hư hỏng');
    }

    // Get current values to track changes
    const currentResult = await pool.query(
      `SELECT "Status", "Priority" FROM "DamageReport" WHERE "ID" = $1`,
      [report.id]
    );
    
    const currentStatus = currentResult.rows[0]?.Status;
    const currentPriority = currentResult.rows[0]?.Priority;

    await pool.query(
      `UPDATE "DamageReport" SET
        "DeviceID" = $1,
        "DamageLocation" = $2,
        "ReporterID" = $3,
        "ReportingDepartmentID" = $4,
        "HandlerID" = $5,
        "AssignedDate" = $6,
        "ReportDate" = $7,
        "HandlingDate" = $8,
        "CompletedDate" = $9,
        "EstimatedCompletionDate" = $10,
        "DamageContent" = $11,
        "Images" = $12,
        "Status" = $13,
        "Priority" = $14,
        "Notes" = $15,
        "HandlerNotes" = $16,
        "RejectionReason" = $17,
        "UpdatedBy" = $18,
        "UpdatedAt" = CURRENT_TIMESTAMP
      WHERE "ID" = $19`,
      [
        report.deviceId || null,
        report.damageLocation || null,
        report.reporterId,
        report.reportingDepartmentId,
        report.handlerId || null,
        report.assignedDate || null,
        report.reportDate,
        report.handlingDate || null,
        report.completedDate || null,
        report.estimatedCompletionDate || null,
        report.damageContent,
        report.images ? JSON.stringify(report.images) : null,
        report.status.toString(),
        report.priority.toString(),
        report.notes || null,
        report.handlerNotes || null,
        report.rejectionReason || null,
        report.updatedBy || null,
        report.id,
      ]
    );

    // Track changes to Status
    if (currentStatus && currentStatus !== report.status.toString() && report.updatedBy) {
      await pool.query(
        `INSERT INTO "DamageReportHistory" ("DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy")
         VALUES ($1, 'Status', $2, $3, $4)`,
        [report.id, currentStatus, report.status.toString(), report.updatedBy]
      );
    }

    // Track changes to Priority
    if (currentPriority && currentPriority !== report.priority.toString() && report.updatedBy) {
      await pool.query(
        `INSERT INTO "DamageReportHistory" ("DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy")
         VALUES ($1, 'Priority', $2, $3, $4)`,
        [report.id, currentPriority, report.priority.toString(), report.updatedBy]
      );
    }

    // Auto-update device status when status changes
    if (report.deviceId) {
      if (report.status === DamageReportStatus.InProgress) {
        // Set device to "Đang sửa chữa"
        await pool.query(
          `UPDATE "Device" SET "Status" = '2' WHERE "ID" = $1`,
          [report.deviceId]
        );
      } else if (report.status === DamageReportStatus.Completed) {
        // Set device to "Đang sử dụng" (assume fixed successfully)
        await pool.query(
          `UPDATE "Device" SET "Status" = '1' WHERE "ID" = $1`,
          [report.deviceId]
        );
      }
    }

    return report.id;
  }

  async updateStatus(id: number, status: DamageReportStatus, updatedBy: string): Promise<number> {
    // Get current status
    const currentResult = await pool.query(
      `SELECT "Status" FROM "DamageReport" WHERE "ID" = $1`,
      [id]
    );
    
    if (currentResult.rows.length === 0) {
      throw new Error('Báo cáo không tồn tại');
    }

    const currentStatus = currentResult.rows[0].Status;

    // Update status
    await pool.query(
      `UPDATE "DamageReport" SET "Status" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $3`,
      [status.toString(), updatedBy, id]
    );

    // Track change in history
    if (currentStatus !== status.toString()) {
      await pool.query(
        `INSERT INTO "DamageReportHistory" ("DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy")
         VALUES ($1, 'Status', $2, $3, $4)`,
        [id, currentStatus, status.toString(), updatedBy]
      );
    }

    return id;
  }

  async updatePriority(id: number, priority: DamageReportPriority, updatedBy: string): Promise<number> {
    // Get current priority
    const currentResult = await pool.query(
      `SELECT "Priority" FROM "DamageReport" WHERE "ID" = $1`,
      [id]
    );
    
    if (currentResult.rows.length === 0) {
      throw new Error('Báo cáo không tồn tại');
    }

    const currentPriority = currentResult.rows[0].Priority;

    // Update priority
    await pool.query(
      `UPDATE "DamageReport" SET "Priority" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $3`,
      [priority.toString(), updatedBy, id]
    );

    // Track change in history
    if (currentPriority !== priority.toString()) {
      await pool.query(
        `INSERT INTO "DamageReportHistory" ("DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy")
         VALUES ($1, 'Priority', $2, $3, $4)`,
        [id, currentPriority, priority.toString(), updatedBy]
      );
    }

    return id;
  }

  async updateHandlerNotes(id: number, handlerNotes: string, updatedBy: string): Promise<number> {
    // Get current handler notes
    const currentResult = await pool.query(
      `SELECT "HandlerNotes" FROM "DamageReport" WHERE "ID" = $1`,
      [id]
    );
    
    if (currentResult.rows.length === 0) {
      throw new Error('Báo cáo không tồn tại');
    }

    const currentHandlerNotes = currentResult.rows[0].HandlerNotes || '';

    // Update handler notes
    await pool.query(
      `UPDATE "DamageReport" SET "HandlerNotes" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $3`,
      [handlerNotes || null, updatedBy, id]
    );

    // Track change in history if notes actually changed
    if (currentHandlerNotes !== (handlerNotes || '')) {
      await pool.query(
        `INSERT INTO "DamageReportHistory" ("DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy")
         VALUES ($1, 'HandlerNotes', $2, $3, $4)`,
        [id, currentHandlerNotes || '', handlerNotes || '', updatedBy]
      );
    }

    return id;
  }

  async delete(id: number): Promise<boolean> {
    await pool.query('DELETE FROM "DamageReport" WHERE "ID" = $1', [id]);
    return true;
  }
}

