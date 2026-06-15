import pool from '../db';
import { PoolClient } from 'pg';
import { DamageReport, DamageReportVM, DamageReportStatus, DamageReportPriority, DeviceStatus, EventStatus, TimelineEntry } from '@/types';
import { EventService } from './eventService';
import { NotificationService, NotificationType, NotificationCategory } from './notificationService';
import { getVNNow } from '../utils/dateFormat';

export class DamageReportService {
  private async ensureHistorySequence(client?: PoolClient): Promise<void> {
    const executor = client || pool;
    const maxRes = await executor.query('SELECT COALESCE(MAX("ID"), 0) AS max_id FROM "DamageReportHistory"');
    const seqRes = await executor.query('SELECT last_value, is_called FROM "DamageReportHistory_ID_seq"');

    const maxId = Number(maxRes.rows[0]?.max_id || 0);
    let seqValue = Number(seqRes.rows[0]?.last_value || 0);
    const isCalled = seqRes.rows[0]?.is_called ?? false;

    if (!isCalled) {
      seqValue -= 1;
    }

    if (maxId > seqValue) {
      await executor.query(
        'SELECT setval(pg_get_serial_sequence(\'"DamageReportHistory"\', \'ID\'), $1, true)',
        [maxId]
      );
    }
  }

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
    status?: DamageReportStatus | string | number[];
    priority?: DamageReportPriority;
    deviceId?: number;
    reporterId?: number;
    handlerId?: number;
    departmentId?: number;
    locationId?: number;
    search?: string;
    maintenanceBatchId?: string;
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
        dr."AfterImages" as "afterImages",
        CAST(dr."Status"::text AS INTEGER) as status,
        CAST(dr."Priority"::text AS INTEGER) as priority,
        dr."Notes" as notes,
        dr."HandlerNotes" as "handlerNotes",
        dr."RejectionReason" as "rejectionReason",
        dr."MaintenanceBatchId" as "maintenanceBatchId",
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
        loc."Name" as "deviceLocationName",
        updated_user."FullName" as "updatedByName",
        source_plan."ID" as "sourcePlanId",
        source_plan."PlanDate" as "sourcePlanDate",
        (SELECT drp."Title" 
         FROM "DeviceReminderPlan" drp 
         WHERE drp."Metadata" IS NOT NULL
           AND (
             drp."Metadata"::text LIKE '%"maintenanceBatchId":"' || dr."MaintenanceBatchId" || '"%'
             OR (drp."Metadata"::jsonb ? 'maintenanceBatchId' 
                 AND (drp."Metadata"->>'maintenanceBatchId') = dr."MaintenanceBatchId")
           )
         LIMIT 1
        ) as "maintenanceBatchTitle"
      FROM "DamageReport" dr
      LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
      LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
      LEFT JOIN "Department" reporter_dept ON dr."ReportingDepartmentID" = reporter_dept."ID"
      LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
      LEFT JOIN "Department" handler_dept ON handler."DepartmentID" = handler_dept."ID"
      LEFT JOIN "Location" loc ON d."LocationID" = loc."ID"
      LEFT JOIN "AspNetUsers" updated_user ON dr."UpdatedBy" = updated_user."Id"
      LEFT JOIN LATERAL (
        SELECT wpi."ID", wpi."PlanDate"
        FROM "WorkPlanItem" wpi
        WHERE wpi."DamageReportID" = dr."ID"
        ORDER BY wpi."ID" DESC
        LIMIT 1
      ) source_plan ON TRUE
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // View permission: If user is not admin, show reports where they are handler OR reporter
    if (filters && !filters.isAdmin && filters.currentUserId) {
      query += ` AND (
        dr."HandlerID" IN (SELECT "ID" FROM "Staff" WHERE "UserId" = $${paramIndex}) OR
        dr."ReporterID" IN (SELECT "ID" FROM "Staff" WHERE "UserId" = $${paramIndex})
      )`;
      params.push(filters.currentUserId);
      paramIndex++;
    }

    if (filters) {
      if (filters.status) {
        const statusStr = filters.status.toString();
        if (statusStr.includes(',')) {
          const statuses = statusStr.split(',').map(s => s.trim());
          query += ` AND dr."Status"::text = ANY($${paramIndex}::text[])`;
          params.push(statuses);
        } else {
          query += ` AND dr."Status" = $${paramIndex}`;
          params.push(statusStr);
        }
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
        query += ` AND handler."DepartmentID" = $${paramIndex}`;
        params.push(filters.departmentId);
        paramIndex++;
      }

      if (filters.locationId) {
        // Filter reports where the device's location matches (recursive parent-child check)
        query += ` AND d."LocationID" IN (
          WITH RECURSIVE sub_locations AS (
            SELECT "ID" FROM "Location" WHERE "ID" = $${paramIndex}
            UNION ALL
            SELECT l."ID" FROM "Location" l
            INNER JOIN sub_locations sl ON l."ParentID" = sl."ID"
          )
          SELECT "ID" FROM sub_locations
        )`;
        params.push(filters.locationId);
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

      if (filters.maintenanceBatchId) {
        if (filters.maintenanceBatchId === 'only-maintenance') {
          query += ` AND dr."MaintenanceBatchId" IS NOT NULL`;
        } else if (filters.maintenanceBatchId === 'none-maintenance') {
          query += ` AND dr."MaintenanceBatchId" IS NULL`;
        } else {
          query += ` AND dr."MaintenanceBatchId" = $${paramIndex}`;
          params.push(filters.maintenanceBatchId);
          paramIndex++;
        }
      }
    }

    query += ` ORDER BY dr."ReportDate" DESC, dr."ID" DESC`;

    const result = await pool.query(query, params);

    return result.rows.map((row: any) => this.mapRowToVM(row));
  }

  async getPaginated(filters: {
    page: number;
    limit: number;
    status?: DamageReportStatus | string | number[];
    priority?: DamageReportPriority;
    deviceId?: number;
    reporterId?: number;
    handlerId?: number;
    departmentId?: number;
    locationId?: number;
    search?: string;
    maintenanceBatchId?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    isAdmin?: boolean;
    currentUserId?: string;
  }): Promise<{ reports: DamageReportVM[]; total: number }> {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      priority, 
      deviceId, 
      reporterId, 
      handlerId, 
      departmentId, 
      locationId,
      search, 
      maintenanceBatchId,
      sortField = 'reportDate', 
      sortOrder = 'desc',
      isAdmin = false,
      currentUserId
    } = filters;
    
    const offset = (page - 1) * limit;
    const params: any[] = [];
    let whereClause = 'WHERE 1=1';

    // View permission: If user is not admin, show reports where they are handler OR reporter
    if (!isAdmin && currentUserId) {
      params.push(currentUserId);
      whereClause += ` AND (
        dr."HandlerID" IN (SELECT "ID" FROM "Staff" WHERE "UserId" = $${params.length}) OR
        dr."ReporterID" IN (SELECT "ID" FROM "Staff" WHERE "UserId" = $${params.length})
      )`;
    }

    if (status) {
      const statusStr = status.toString();
      if (statusStr.includes(',')) {
        const statuses = statusStr.split(',').map(s => s.trim());
        params.push(statuses);
        whereClause += ` AND dr."Status"::text = ANY($${params.length}::text[])`;
      } else {
        params.push(statusStr);
        whereClause += ` AND dr."Status" = $${params.length}`;
      }
    }

    if (priority) {
      params.push(priority.toString());
      whereClause += ` AND dr."Priority" = $${params.length}`;
    }

    if (deviceId) {
      params.push(deviceId);
      whereClause += ` AND dr."DeviceID" = $${params.length}`;
    }

    if (reporterId) {
      params.push(reporterId);
      whereClause += ` AND dr."ReporterID" = $${params.length}`;
    }

    if (handlerId) {
      params.push(handlerId);
      whereClause += ` AND dr."HandlerID" = $${params.length}`;
    }

    if (departmentId) {
      params.push(departmentId);
      whereClause += ` AND handler."DepartmentID" = $${params.length}`;
    }

    if (locationId) {
      params.push(locationId);
      whereClause += ` AND (d."LocationID" IN (
        WITH RECURSIVE sub_locations AS (
          SELECT "ID" FROM "Location" WHERE "ID" = $${params.length}
          UNION ALL
          SELECT l."ID" FROM "Location" l
          INNER JOIN sub_locations sl ON l."ParentID" = sl."ID"
        )
        SELECT "ID" FROM sub_locations
      ) OR dr."DamageLocation" ILIKE (SELECT "Name" FROM "Location" WHERE "ID" = $${params.length}))`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const i = params.length;
      whereClause += ` AND (
        dr."DamageContent" ILIKE $${i} OR
        dr."DamageLocation" ILIKE $${i} OR
        d."Name" ILIKE $${i} OR
        reporter."Name" ILIKE $${i} OR
        handler."Name" ILIKE $${i}
      )`;
    }

    if (maintenanceBatchId) {
      if (maintenanceBatchId === 'only-maintenance') {
        whereClause += ` AND dr."MaintenanceBatchId" IS NOT NULL`;
      } else if (maintenanceBatchId === 'none-maintenance') {
        whereClause += ` AND dr."MaintenanceBatchId" IS NULL`;
      } else {
        params.push(maintenanceBatchId);
        whereClause += ` AND dr."MaintenanceBatchId" = $${params.length}`;
      }
    }

    // Sort field mapping
    const sortFieldMap: Record<string, string> = {
      'reportDate': 'dr."ReportDate"',
      'status': 'dr."Status"',
      'priority': 'dr."Priority"',
      'deviceName': 'd."Name"',
      'id': 'dr."ID"',
      'completedDate': 'dr."CompletedDate"',
      'estimatedCompletionDate': 'dr."EstimatedCompletionDate"'
    };
    
    const sortBy = sortFieldMap[sortField] || 'dr."ReportDate"';
    const order = sortOrder === 'desc' ? 'DESC' : 'ASC';

    try {
      // Get total count
      const countQuery = `
        SELECT COUNT(*) 
        FROM "DamageReport" dr
        LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
        LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
        LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated data
      const dataQuery = `
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
          dr."AfterImages" as "afterImages",
          CAST(dr."Status"::text AS INTEGER) as status,
          CAST(dr."Priority"::text AS INTEGER) as priority,
          dr."Notes" as notes,
          dr."HandlerNotes" as "handlerNotes",
          dr."RejectionReason" as "rejectionReason",
          dr."MaintenanceBatchId" as "maintenanceBatchId",
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
          loc."Name" as "deviceLocationName",
          updated_user."FullName" as "updatedByName",
          source_plan."ID" as "sourcePlanId",
          source_plan."PlanDate" as "sourcePlanDate"
        FROM "DamageReport" dr
        LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
        LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
        LEFT JOIN "Department" reporter_dept ON dr."ReportingDepartmentID" = reporter_dept."ID"
        LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
        LEFT JOIN "Department" handler_dept ON handler."DepartmentID" = handler_dept."ID"
        LEFT JOIN "Location" loc ON d."LocationID" = loc."ID"
        LEFT JOIN "AspNetUsers" updated_user ON dr."UpdatedBy" = updated_user."Id"
        LEFT JOIN LATERAL (
          SELECT wpi."ID", wpi."PlanDate"
          FROM "WorkPlanItem" wpi
          WHERE wpi."DamageReportID" = dr."ID"
          ORDER BY wpi."ID" DESC
          LIMIT 1
        ) source_plan ON TRUE
        ${whereClause}
        ORDER BY ${sortBy} ${order}, dr."ID" DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      const dataParams = [...params, limit, offset];
      const result = await pool.query(dataQuery, dataParams);

      const reports = result.rows.map((row: any) => this.mapRowToVM(row));

      return { reports, total };
    } catch (error) {
      console.error('DamageReportService.getPaginated error:', error);
      throw error;
    }
  }

  private mapRowToVM(row: any): DamageReportVM {
    const reportDate = row.reportDate ? new Date(row.reportDate) : getVNNow();
    const today = getVNNow();
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
      afterImages: row.afterImages ? (Array.isArray(row.afterImages) ? row.afterImages : JSON.parse(row.afterImages)) : [],
      statusName: this.getStatusName(status),
      priorityName: this.getPriorityName(priority),
      daysSinceReport,
      daysInProgress,
      isOverdue,
      displayLocation: row.deviceName || row.maintenanceBatchTitle || row.damageLocation || 'Không xác định',
      deviceLocationName: row.deviceLocationName || null,
      sourcePlanId: row.sourcePlanId ? Number(row.sourcePlanId) : null,
      sourcePlanDate: row.sourcePlanDate || null,
      isFromWorkPlan: Boolean(row.sourcePlanId),
    } as DamageReportVM;
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
        dr."AfterImages" as "afterImages",
        CAST(dr."Status"::text AS INTEGER) as status,
        CAST(dr."Priority"::text AS INTEGER) as priority,
        dr."Notes" as notes,
        dr."HandlerNotes" as "handlerNotes",
        dr."RejectionReason" as "rejectionReason",
        dr."MaintenanceBatchId" as "maintenanceBatchId",
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
        loc."Name" as "deviceLocationName",
        updated_user."FullName" as "updatedByName",
        source_plan."ID" as "sourcePlanId",
        source_plan."PlanDate" as "sourcePlanDate",
        (SELECT drp."Title" 
         FROM "DeviceReminderPlan" drp 
         WHERE drp."Metadata" IS NOT NULL
           AND (
             drp."Metadata"::text LIKE '%"maintenanceBatchId":"' || dr."MaintenanceBatchId" || '"%'
             OR (drp."Metadata"::jsonb ? 'maintenanceBatchId' 
                 AND (drp."Metadata"->>'maintenanceBatchId') = dr."MaintenanceBatchId")
           )
         LIMIT 1
        ) as "maintenanceBatchTitle"
      FROM "DamageReport" dr
      LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
      LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
      LEFT JOIN "Department" reporter_dept ON dr."ReportingDepartmentID" = reporter_dept."ID"
      LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
      LEFT JOIN "Department" handler_dept ON handler."DepartmentID" = handler_dept."ID"
      LEFT JOIN "Location" loc ON d."LocationID" = loc."ID"
      LEFT JOIN "AspNetUsers" updated_user ON dr."UpdatedBy" = updated_user."Id"
      LEFT JOIN LATERAL (
        SELECT wpi."ID", wpi."PlanDate"
        FROM "WorkPlanItem" wpi
        WHERE wpi."DamageReportID" = dr."ID"
        ORDER BY wpi."ID" DESC
        LIMIT 1
      ) source_plan ON TRUE
      WHERE dr."ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const status = parseInt(row.status) as DamageReportStatus;
    const priority = parseInt(row.priority) as DamageReportPriority;

    const reportDate = row.reportDate ? new Date(row.reportDate) : getVNNow();
    const today = getVNNow();
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
      displayLocation: row.deviceName || row.maintenanceBatchTitle || row.damageLocation || 'Không xác định',
      sourcePlanId: row.sourcePlanId ? Number(row.sourcePlanId) : null,
      sourcePlanDate: row.sourcePlanDate || null,
      isFromWorkPlan: Boolean(row.sourcePlanId),
    } as DamageReportVM;
  }

  async create(report: Omit<DamageReport, 'id'>): Promise<number> {
    // Validate: Must have damageContent (device/location optional for general tasks)
    if (!report.damageContent || report.damageContent.trim() === '') {
      throw new Error('Vui lòng nhập nội dung công việc');
    }

    const result = await pool.query(
      `INSERT INTO "DamageReport" (
        "DeviceID", "DamageLocation", "ReporterID", "ReportingDepartmentID",
        "HandlerID", "AssignedDate", "ReportDate", "HandlingDate", "CompletedDate",
        "EstimatedCompletionDate", "DamageContent", "Images", "AfterImages", "Status", "Priority",
        "Notes", "HandlerNotes", "RejectionReason", "MaintenanceBatchId", "CreatedBy", "UpdatedBy"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING "ID"`,
      [
        report.deviceId || null,
        report.damageLocation || null,
        report.reporterId,
        report.reportingDepartmentId,
        report.handlerId || null,
        report.assignedDate || null,
        report.reportDate || getVNNow(),
        report.handlingDate || null,
        report.completedDate || null,
        report.estimatedCompletionDate || null,
        report.damageContent,
        report.images ? JSON.stringify(report.images) : null,
        report.afterImages ? JSON.stringify(report.afterImages) : null,
        report.status.toString(),
        report.priority.toString(),
        report.notes || null,
        report.handlerNotes || null,
        report.rejectionReason || null,
        report.maintenanceBatchId || null,
        report.createdBy || null,
        report.updatedBy || null,
      ]
    );

    const id = result.rows[0].ID;

    // Sync maintenance events if linked to a batch
    if (report.maintenanceBatchId) {
      try {
        await this.syncMaintenanceBatchEvents(id, report.status, report.createdBy || '', {
          handlerId: report.handlerId,
          handlingDate: report.handlingDate,
          handlerNotes: report.handlerNotes || report.notes,
          damageContent: report.damageContent,
        });
      } catch (err) {
        console.error('Failed to sync maintenance events on create:', err);
      }
    }

    if (report.deviceId) {
      await this.syncDeviceStatus(report.deviceId);
    }

    // Await notifications to ensure they finish on serverless
    try {
        await this.notifyNewReport(id, report.damageContent, report.reporterId, report.createdBy);
        
        // Notify handler specifically if assigned
        if (report.handlerId) {
            await this.notifyHandlerAssigned(id, report.handlerId, report.damageContent, report.createdBy);
        }
    } catch (err) {
        console.error('Failed to send push notifications:', err);
    }

    return id;
  }

  private async notifyHandlerAssigned(reportId: number, handlerId: number, content: string, createdBy?: string) {
    try {
      const notificationService = new NotificationService();
      await notificationService.createNotification({
        title: 'Công việc mới được giao 📋',
        content: `Bạn được giao xử lý báo cáo: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
        type: NotificationType.Report,
        category: NotificationCategory.New,
        targetUrl: `/dashboard/damage-reports`,
        staffId: handlerId,
        createdBy: createdBy,
        excludeUserId: createdBy
      });
    } catch (error) {
      console.error('Error in notifyHandlerAssigned:', error);
    }
  }

  private async notifyNewReport(reportId: number, content: string, reporterId: number, createdBy?: string) {
    try {
      const notificationService = new NotificationService();
      
      // Get reporter name
      const reporterRes = await pool.query('SELECT "Name" FROM "Staff" WHERE "ID" = $1', [reporterId]);
      const reporterName = reporterRes.rows[0]?.Name || 'Một nhân viên';

      await notificationService.createNotification({
        title: 'Báo cáo sự cố mới ⚠️',
        content: `${reporterName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
        type: NotificationType.Report,
        category: NotificationCategory.New,
        targetUrl: `/dashboard/damage-reports`, // You could improve this to point to specific ID if needed
        createdBy: createdBy,
        excludeUserId: createdBy
      });
    } catch (error) {
      console.error('Error in notifyNewReport:', error);
    }
  }

  async update(report: DamageReport): Promise<number> {
    // Validate: Must have damageContent (device/location optional for general tasks)
    if (!report.damageContent || report.damageContent.trim() === '') {
      throw new Error('Vui lòng nhập nội dung công việc');
    }

    const currentResult = await pool.query(
      `SELECT "Status", "Priority", "DeviceID", "HandlerID", "DamageContent", "HandlerNotes" FROM "DamageReport" WHERE "ID" = $1`,
      [report.id]
    );
    
    const currentStatus = currentResult.rows[0]?.Status;
    const currentPriority = currentResult.rows[0]?.Priority;
    const currentHandlerId = currentResult.rows[0]?.HandlerID;
    const currentContent = currentResult.rows[0]?.DamageContent;
    const currentHandlerNotes = currentResult.rows[0]?.HandlerNotes;
    const oldDeviceId = currentResult.rows[0]?.DeviceID;

    // Handle HandlerNotes timeline protection
    // RULE: If the DB already has a JSON timeline, NEVER overwrite it with null/undefined/empty/plain-text
    // from a general edit form. Only the dedicated handler-notes API should modify the timeline.
    let finalHandlerNotes = report.handlerNotes;
    
    // Case 1: incoming is null/undefined/empty → preserve existing timeline
    const isIncomingEmpty = !finalHandlerNotes || (typeof finalHandlerNotes === 'string' && finalHandlerNotes.trim() === '');
    if (isIncomingEmpty && currentHandlerNotes) {
      finalHandlerNotes = currentHandlerNotes;
    }
    // Case 2: incoming is a plain string (not a JSON array) and DB already has a JSON timeline → preserve timeline
    else if (
      finalHandlerNotes &&
      typeof finalHandlerNotes === 'string' &&
      !finalHandlerNotes.startsWith('[') &&
      currentHandlerNotes &&
      typeof currentHandlerNotes === 'string' &&
      currentHandlerNotes.startsWith('[')
    ) {
      try {
        const timeline = JSON.parse(currentHandlerNotes);
        if (Array.isArray(timeline) && timeline.length > 0) {
          // Always preserve the full JSON timeline when coming from general Edit form
          // (handler-notes dedicated API handles appending/editing entries)
          finalHandlerNotes = currentHandlerNotes;
        }
      } catch (e) {}
    }
    // Case 3: incoming is a valid JSON timeline → use it directly (from handler-notes editor)

    // Handle date clearing and auto-setting based on status transition for full update
    let finalHandlingDate: Date | null | undefined = report.handlingDate;
    let finalCompletedDate: Date | null | undefined = report.completedDate;
    const now = getVNNow();

    if (currentStatus && currentStatus !== report.status.toString()) {
      const nextStatus = report.status;

      if (nextStatus === DamageReportStatus.Pending) {
        // 1. Chuyển sang Chờ xử lý (1) -> Xóa cả ngày xử lý và ngày hoàn thành
        finalHandlingDate = null;
        finalCompletedDate = null;
      } else if (nextStatus === DamageReportStatus.Completed) {
        // 2. Chuyển sang Hoàn thành (4) -> Tự động gán ngày hoàn thành nếu chưa có
        if (!finalCompletedDate) finalCompletedDate = now;
      } else {
        // 3. Các trạng thái khác (Đang xử lý, Đã phân công, v.v.) -> Xóa ngày hoàn thành
        finalCompletedDate = null;
        
        // Nếu là Đang xử lý (3) -> Gán ngày xử lý nếu chưa có
        if (nextStatus === DamageReportStatus.InProgress && !finalHandlingDate) {
          finalHandlingDate = now;
        }
      }
    }

    // Validation for date logic
    if (finalHandlingDate && report.reportDate) {
      const hDate = new Date(finalHandlingDate);
      const rDate = new Date(report.reportDate);
      if (hDate < rDate) {
        throw new Error('Ngày bắt đầu xử lý không thể nhỏ hơn ngày báo cáo.');
      }
      if (hDate > now) {
        throw new Error('Ngày bắt đầu xử lý không thể vượt quá thời gian hiện tại.');
      }
    }

    if (finalCompletedDate) {
      const cDate = new Date(finalCompletedDate);
      if (cDate > now) {
        throw new Error('Ngày hoàn thành không thể vượt quá thời gian hiện tại.');
      }
      if (report.reportDate) {
        const rDate = new Date(report.reportDate);
        if (cDate < rDate) {
          throw new Error('Ngày hoàn thành không thể nhỏ hơn ngày báo cáo.');
        }
      }
      if (finalHandlingDate) {
        const hDate = new Date(finalHandlingDate);
        if (cDate < hDate) {
          throw new Error('Ngày hoàn thành không thể nhỏ hơn ngày bắt đầu xử lý.');
        }
      }
    }

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
        "AfterImages" = $13,
        "Status" = $14,
        "Priority" = $15,
        "Notes" = $16,
        "HandlerNotes" = $17,
        "RejectionReason" = $18,
        "MaintenanceBatchId" = $19,
        "UpdatedBy" = $20,
        "UpdatedAt" = CURRENT_TIMESTAMP
      WHERE "ID" = $21`,
      [
        report.deviceId || null,
        report.damageLocation || null,
        report.reporterId,
        report.reportingDepartmentId,
        report.handlerId || null,
        report.assignedDate || null,
        report.reportDate,
        finalHandlingDate || null,
        finalCompletedDate || null,
        report.estimatedCompletionDate || null,
        report.damageContent,
        report.images ? JSON.stringify(report.images) : null,
        report.afterImages ? JSON.stringify(report.afterImages) : null,
        report.status.toString(),
        report.priority.toString(),
        report.notes || null,
        finalHandlerNotes || null,
        report.rejectionReason || null,
        report.maintenanceBatchId || null,
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
      if (report.status === DamageReportStatus.Cancelled || report.status === DamageReportStatus.Rejected) {
        // Revert to '1' (DangSuDung) by default if not specified otherwise
        // Actually, syncDeviceStatus will handle the logic if we don't hardcode it here.
        // Let's remove the hardcoded '1' update to let syncDeviceStatus decide or rely on manual updateStatus.
      }
      await this.syncDeviceStatus(report.deviceId);
    }
    
    // If the device was changed, sync the old device as well
    if (oldDeviceId && oldDeviceId !== report.deviceId) {
      await this.syncDeviceStatus(oldDeviceId);
    }

    // Sync maintenance events if status or batch changed
    if (report.maintenanceBatchId) {
      try {
        await this.syncMaintenanceBatchEvents(report.id, report.status, report.updatedBy || '', {
          handlerId: report.handlerId,
          handlingDate: report.handlingDate,
          handlerNotes: report.handlerNotes || report.notes,
          damageContent: report.damageContent,
        });
      } catch (err) {
        console.error('Failed to sync maintenance events on update:', err);
      }
    }

    // Notify handler if assigned or changed
    if (report.handlerId && report.handlerId !== currentHandlerId) {
      try {
        await this.notifyHandlerAssigned(report.id, report.handlerId, report.damageContent || currentContent, report.updatedBy);
      } catch (err) {
        console.error('Failed to notify new handler:', err);
      }
    }

    return report.id;
  }

  async updateStatus(id: number, status: DamageReportStatus, updatedBy: string, finalDeviceStatus?: number | null): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current info
      const currentRes = await client.query(
        `SELECT dr."Status" as status, dr."DeviceID" as device_id, dr."HandlerID" as handler_id, 
                dr."DamageContent" as damage_content, s."Name" as handler_name,
                dr."ReportDate" as report_date, dr."HandlingDate" as handling_date
         FROM "DamageReport" dr
         LEFT JOIN "Staff" s ON dr."HandlerID" = s."ID"
         WHERE dr."ID" = $1`,
        [id]
      );
      
      if (currentRes.rows.length === 0) {
        throw new Error('Báo cáo không tồn tại');
      }

      const row = currentRes.rows[0];
      const currentStatusStr = String(row.status || '');
      const deviceId = row.device_id;
      const damageContent = row.damage_content || '';
      const handlerName = row.handler_name || 'Nhân viên';
      const reportDate = row.report_date ? new Date(row.report_date) : null;
      const handlingDate = row.handling_date ? new Date(row.handling_date) : null;

      // Handle date clearing and auto-setting based on status transition
      let updateQuery = `UPDATE "DamageReport" SET "Status" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP`;
      const updateParams: any[] = [status.toString(), updatedBy, id];
      const now = getVNNow();

      if (status === DamageReportStatus.Pending) {
        // 1. Chuyển sang Chờ xử lý (1) -> Xóa cả ngày xử lý và ngày hoàn thành
        updateQuery += `, "HandlingDate" = NULL, "CompletedDate" = NULL`;
      } else if (status === DamageReportStatus.Completed) {
        // 2. Chuyển sang Hoàn thành (4) -> Gán ngày hoàn thành
        if (handlingDate && now < handlingDate) {
          throw new Error('Ngày hoàn thành không thể nhỏ hơn ngày bắt đầu xử lý. Vui lòng kiểm tra lại thời gian trên hệ thống.');
        }
        if (reportDate && now < reportDate) {
          throw new Error('Ngày hoàn thành không thể nhỏ hơn ngày báo cáo. Vui lòng kiểm tra lại thời gian báo cáo.');
        }
        updateQuery += `, "CompletedDate" = $4`;
        updateParams.push(now);
      } else {
        // 3. Các trạng thái khác -> Xóa ngày hoàn thành
        updateQuery += `, "CompletedDate" = NULL`;
        
        // Nếu chuyển sang Đang xử lý (3) -> Gán ngày xử lý nếu chưa có
        if (status === DamageReportStatus.InProgress) {
          if (!handlingDate) {
            if (reportDate && now < reportDate) {
              throw new Error('Ngày bắt đầu xử lý không thể nhỏ hơn ngày báo cáo. Vui lòng kiểm tra lại thời gian báo cáo.');
            }
            updateQuery += `, "HandlingDate" = $${updateParams.length + 1}`;
            updateParams.push(now);
          }
        }
      }

      updateQuery += ` WHERE "ID" = $3`;

      // Update report status and dates
      await client.query(updateQuery, updateParams);

      // History
      if (currentStatusStr !== status.toString()) {
        await this.ensureHistorySequence();
        await client.query(
          `INSERT INTO "DamageReportHistory" ("DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy")
           VALUES ($1, 'Status', $2, $3, $4)`,
          [id, currentStatusStr, status.toString(), updatedBy]
        );
      }

      // Sync Device
      if (deviceId) {
        if (finalDeviceStatus) {
          await client.query(`UPDATE "Device" SET "Status" = $1 WHERE "ID" = $2`, [finalDeviceStatus.toString(), deviceId]);
        }
        
        // Recalculate device status based on ALL reports
        await this.syncDeviceStatus(deviceId, client);
      }

      await client.query('COMMIT');

      // Send notifications AFTER commit
      if (currentStatusStr !== status.toString()) {
        const notificationService = new NotificationService();
        if (status === DamageReportStatus.Assigned && row.handler_id) {
          await notificationService.createNotification({
            title: 'Công việc mới được giao 📋',
            content: `Bạn được giao xử lý báo cáo: ${damageContent.substring(0, 50)}...`,
            type: NotificationType.Report,
            category: NotificationCategory.New,
            targetUrl: `/dashboard/damage-reports`,
            staffId: row.handler_id,
            createdBy: updatedBy
          });
        } else if (status === DamageReportStatus.InProgress) {
          await notificationService.createNotification({
            title: 'Báo cáo đang được xử lý 🛠️',
            content: `${handlerName} đang xử lý báo cáo: ${damageContent.substring(0, 50)}...`,
            type: NotificationType.Report,
            category: NotificationCategory.InProgress,
            targetUrl: `/dashboard/damage-reports`,
            staffId: row.handler_id, // Targeted notification for the person working on it
            createdBy: updatedBy
          });
        } else if (status === DamageReportStatus.Completed) {
          await notificationService.createNotification({
            title: 'Báo cáo đã hoàn thành ✅',
            content: `Báo cáo: ${damageContent.substring(0, 50)}... đã được hoàn thành.`,
            type: NotificationType.Report,
            category: NotificationCategory.Completed,
            targetUrl: `/dashboard/damage-reports`,
            staffId: row.handler_id, // Notify the handler that their work is officially completed
            createdBy: updatedBy
          });
        }
      }

      return id;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }


  async updateHandlingDate(id: number, handlingDate: Date | null, updatedBy: string): Promise<void> {
    const currentResult = await pool.query(
      `SELECT "HandlingDate" FROM "DamageReport" WHERE "ID" = $1`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      throw new Error('Báo cáo không tồn tại');
    }

    await pool.query(
      `UPDATE "DamageReport" SET "HandlingDate" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $3`,
      [handlingDate ? handlingDate : null, updatedBy, id]
    );
  }

  async updateCompletionDate(id: number, completedDate: Date | null, updatedBy: string): Promise<void> {
    const currentResult = await pool.query(
      `SELECT "CompletedDate" FROM "DamageReport" WHERE "ID" = $1`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      throw new Error('Báo cáo không tồn tại');
    }

    const currentCompleted = currentResult.rows[0].CompletedDate
      ? new Date(currentResult.rows[0].CompletedDate)
      : null;

    await pool.query(
      `UPDATE "DamageReport" SET "CompletedDate" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $3`,
      [completedDate ? completedDate : null, updatedBy, id]
    );

    const beforeValue = currentCompleted ? currentCompleted.toISOString() : '';
    const afterValue = completedDate ? completedDate.toISOString() : '';

    if (beforeValue !== afterValue) {
      await this.ensureHistorySequence();
      await pool.query(
        `INSERT INTO "DamageReportHistory" ("DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy")
         VALUES ($1, 'CompletedDate', $2, $3, $4)`,
        [id, beforeValue, afterValue, updatedBy]
      );
    }
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

  private parseTimelineNotes(notes: string | null | undefined): TimelineEntry[] {
    if (!notes) return [];
    try {
      const parsed = JSON.parse(notes);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].hasOwnProperty('timestamp')) {
        return parsed as TimelineEntry[];
      }
    } catch (e) {
      // Not JSON, wrap as legacy
    }
    return [{
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      author: 'Hệ thống',
      content: notes,
      type: 'legacy'
    }];
  }

  async appendTimelineNote(id: number, content: string, type: 'manual' | 'auto' | 'legacy', authorName: string, updatedBy: string): Promise<string> {
    const currentResult = await pool.query(
      `SELECT "HandlerNotes" FROM "DamageReport" WHERE "ID" = $1`,
      [id]
    );
    
    if (currentResult.rows.length === 0) {
      throw new Error('Báo cáo không tồn tại');
    }

    const currentHandlerNotes = currentResult.rows[0].HandlerNotes;
    const timeline = this.parseTimelineNotes(currentHandlerNotes);

    const newEntry: TimelineEntry = {
      id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      author: authorName,
      content,
      type
    };

    timeline.push(newEntry);
    const newNotesJson = JSON.stringify(timeline);

    await pool.query(
      `UPDATE "DamageReport" SET "HandlerNotes" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $3`,
      [newNotesJson, updatedBy, id]
    );

    // Track change in history if notes actually changed
    await pool.query(
      `INSERT INTO "DamageReportHistory" ("DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy")
       VALUES ($1, 'HandlerNotes', $2, $3, $4)`,
      [id, currentHandlerNotes || '', newNotesJson, updatedBy]
    );

    return newNotesJson;
  }

  async upsertDailyCheckinNote(id: number, content: string, authorName: string, updatedBy: string): Promise<string> {
    const currentResult = await pool.query(
      `SELECT "HandlerNotes" FROM "DamageReport" WHERE "ID" = $1`,
      [id]
    );
    
    if (currentResult.rows.length === 0) {
      throw new Error('Báo cáo không tồn tại');
    }

    const currentHandlerNotes = currentResult.rows[0].HandlerNotes;
    const timeline = this.parseTimelineNotes(currentHandlerNotes);
    const todayStr = new Date().toISOString().split('T')[0];

    // Find the last 'auto' note from today
    let existingIndex = -1;
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (timeline[i].type === 'auto' && timeline[i].timestamp.startsWith(todayStr)) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex !== -1) {
      timeline[existingIndex].content = content;
      timeline[existingIndex].timestamp = new Date().toISOString();
    } else {
      const newEntry: TimelineEntry = {
        id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        timestamp: new Date().toISOString(),
        author: authorName,
        content,
        type: 'auto'
      };
      timeline.push(newEntry);
    }

    const newNotesJson = JSON.stringify(timeline);

    await pool.query(
      `UPDATE "DamageReport" SET "HandlerNotes" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $3`,
      [newNotesJson, updatedBy, id]
    );

    // Track change in history if notes actually changed
    await pool.query(
      `INSERT INTO "DamageReportHistory" ("DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy")
       VALUES ($1, 'HandlerNotes', $2, $3, $4)`,
      [id, currentHandlerNotes || '', newNotesJson, updatedBy]
    );

    return newNotesJson;
  }

  async updateHandlerNotes(id: number, handlerNotes: string, updatedBy: string): Promise<string> {
    // Check if the incoming string is already a full timeline JSON
    let isFullTimeline = false;
    try {
      if (handlerNotes.trim().startsWith('[')) {
        const parsed = JSON.parse(handlerNotes);
        if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].hasOwnProperty('timestamp') || parsed[0].hasOwnProperty('content'))) {
          isFullTimeline = true;
        }
      }
    } catch (e) {}

    if (isFullTimeline) {
      // Replace the entire field directly if it's a valid timeline
      await pool.query(
        `UPDATE "DamageReport" SET "HandlerNotes" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $3`,
        [handlerNotes, updatedBy, id]
      );
      
      // Track in history
      await pool.query(
        `INSERT INTO "DamageReportHistory" ("DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy")
         VALUES ($1, 'HandlerNotes_Update', 'Timeline Update', $2, $3)`,
        [id, handlerNotes, updatedBy]
      );
      
      return handlerNotes;
    }

    // Traditional behavior: append as 'manual' note
    let authorName = 'Người xử lý';
    try {
      const staffRes = await pool.query('SELECT "Name" FROM "Staff" WHERE "UserId" = $1', [updatedBy]);
      if (staffRes.rows.length > 0) authorName = staffRes.rows[0].Name;
    } catch(e) {}
    
    return this.appendTimelineNote(id, handlerNotes, 'manual', authorName, updatedBy);
  }

  async updateImages(id: number, images: string[] | null, updatedBy: string): Promise<number> {
    const currentResult = await pool.query(
      `SELECT "Images" FROM "DamageReport" WHERE "ID" = $1`,
      [id]
    );
    
    if (currentResult.rows.length === 0) {
      throw new Error('Báo cáo không tồn tại');
    }

    const currentImages = currentResult.rows[0].Images;

    await pool.query(
      `UPDATE "DamageReport" SET "Images" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $3`,
      [images ? JSON.stringify(images) : null, updatedBy, id]
    );

    // Track history
    const beforeValue = currentImages ? (typeof currentImages === 'string' ? currentImages : JSON.stringify(currentImages)) : '[]';
    const afterValue = images ? JSON.stringify(images) : '[]';

    if (beforeValue !== afterValue) {
      await pool.query(
        `INSERT INTO "DamageReportHistory" ("DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy")
         VALUES ($1, 'Images', $2, $3, $4)`,
        [id, beforeValue, afterValue, updatedBy]
      );
    }

    return id;
  }

  async updateAfterImages(id: number, afterImages: string[] | null, updatedBy: string): Promise<number> {
    const currentResult = await pool.query(
      `SELECT "AfterImages" FROM "DamageReport" WHERE "ID" = $1`,
      [id]
    );
    
    if (currentResult.rows.length === 0) {
      throw new Error('Báo cáo không tồn tại');
    }

    const currentAfterImages = currentResult.rows[0].AfterImages;

    await pool.query(
      `UPDATE "DamageReport" SET "AfterImages" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $3`,
      [afterImages ? JSON.stringify(afterImages) : null, updatedBy, id]
    );

    // Track history
    const beforeValue = currentAfterImages ? (typeof currentAfterImages === 'string' ? currentAfterImages : JSON.stringify(currentAfterImages)) : '[]';
    const afterValue = afterImages ? JSON.stringify(afterImages) : '[]';

    if (beforeValue !== afterValue) {
      await pool.query(
        `INSERT INTO "DamageReportHistory" ("DamageReportID", "FieldName", "OldValue", "NewValue", "ChangedBy")
         VALUES ($1, 'AfterImages', $2, $3, $4)`,
        [id, beforeValue, afterValue, updatedBy]
      );
    }

    return id;
  }

  async delete(id: number): Promise<boolean> {
    await pool.query('DELETE FROM "DamageReport" WHERE "ID" = $1', [id]);
    return true;
  }

  /**
   * Synchronize maintenance events for a specific batch based on a damage report's status
   */
  async syncMaintenanceBatchEvents(
    reportId: number, 
    status: DamageReportStatus, 
    userId: string | null | undefined,
    options?: {
      handlerId?: number | null;
      handlingDate?: Date | null;
      handlerNotes?: string | null;
      damageContent?: string | null;
      eventTypeId?: number | null;
      eventTitle?: string | null;
      eventDescription?: string | null;
    }
  ): Promise<void> {
    const reportRes = await pool.query(
      `SELECT "MaintenanceBatchId", "DamageContent", "HandlerID", "HandlingDate", "HandlerNotes" 
       FROM "DamageReport" WHERE "ID" = $1`,
      [reportId]
    );
    
    const report = reportRes.rows[0];
    if (!report || !report.MaintenanceBatchId) return;

    const batchId = report.MaintenanceBatchId;
    const eventService = new EventService();

    let mappedStatus = EventStatus.Planned;
    const s = Number(status);
    if (s === DamageReportStatus.InProgress) mappedStatus = EventStatus.InProgress;
    else if (s === DamageReportStatus.Completed) mappedStatus = EventStatus.Completed;
    else if (s === DamageReportStatus.Cancelled || s === DamageReportStatus.Rejected) mappedStatus = EventStatus.Cancelled;

    const now = new Date();
    // Use current time as fallback for start/end dates
    const startDateUpdate = [DamageReportStatus.InProgress, DamageReportStatus.Completed].includes(s) 
      ? `, "StartDate" = COALESCE("StartDate", CURRENT_TIMESTAMP)` : '';
    const endDateUpdate = [DamageReportStatus.Completed, DamageReportStatus.Cancelled, DamageReportStatus.Rejected].includes(s) 
      ? `, "EndDate" = COALESCE("EndDate", CURRENT_TIMESTAMP)` : ', "EndDate" = NULL';

    const metadataFilter = `%"maintenanceBatchId":"${batchId}"%`;

    // Prepare notes update if provided
    let notesUpdateClause = '';
    let notesParamIndex = -1;
    const updateParams1: any[] = [mappedStatus, reportId];
    if (options?.handlerNotes !== undefined) {
      updateParams1.push(options.handlerNotes);
      notesParamIndex = updateParams1.length;
      notesUpdateClause = `, "Notes" = $${notesParamIndex}`;
    }

    // 1. Update events ALREADY linked to this report (strict match)
    await pool.query(
      `UPDATE "Event" 
       SET "Status" = $1, "UpdatedAt" = CURRENT_TIMESTAMP ${startDateUpdate} ${endDateUpdate} ${notesUpdateClause}
       WHERE "RelatedReportID" = $2`,
      updateParams1
    );

    // 2. Identify devices in the batch that already have an event for THIS report
    const hasEventDeviceIdsRes = await pool.query(
      `SELECT "DeviceID" FROM "Event" WHERE "RelatedReportID" = $1`,
      [reportId]
    );
    const hasEventDeviceIds = new Set(hasEventDeviceIdsRes.rows.map(r => r.DeviceID));

    // Prepare params for step 3
    const updateParams3: any[] = [mappedStatus, reportId, metadataFilter, batchId];
    let notesUpdateClause3 = '';
    if (options?.handlerNotes !== undefined) {
      updateParams3.push(options.handlerNotes);
      notesUpdateClause3 = `, "Notes" = $${updateParams3.length}`;
    }

    // 3. Update existing UNLINKED non-completed events for this batch (loose match)
    // This handles cases where events were created by the scheduler but not yet linked to a report
    await pool.query(
      `UPDATE "Event" 
       SET "Status" = $1, "UpdatedAt" = CURRENT_TIMESTAMP ${startDateUpdate} ${endDateUpdate} ${notesUpdateClause3},
           "RelatedReportID" = $2
       WHERE ("Metadata"::text LIKE $3 OR ("Metadata"->>'maintenanceBatchId') = $4)
         AND "RelatedReportID" IS NULL`,
      updateParams3
    );

    // 4. Find plans belonging to this batch to identify missing events
    const plansResult = await pool.query(
      `
      SELECT 
        drp."ID" as id,
        drp."DeviceID" as "deviceId",
        drp."Title" as title,
        drp."EventTypeID" as "eventTypeId",
        drp."IntervalValue" as "intervalValue",
        drp."IntervalUnit" as "intervalUnit",
        drp."NextDueDate" as "nextDueDate",
        drp."Metadata" as metadata,
        d."Name" as "deviceName"
      FROM "DeviceReminderPlan" drp
      LEFT JOIN "Device" d ON drp."DeviceID" = d."ID"
      WHERE drp."Metadata" IS NOT NULL
        AND (
          drp."Metadata"::text LIKE $1
          OR (drp."Metadata"->>'maintenanceBatchId') = $2
        )
        AND drp."IsActive" = true
      `,
      [metadataFilter, batchId]
    );
    const plans = plansResult.rows || [];

    // 5. Re-check device IDs that now have events for this report (after update in step 3)
    const finalHasEventDeviceIdsRes = await pool.query(
      `SELECT "DeviceID" FROM "Event" WHERE "RelatedReportID" = $1`,
      [reportId]
    );
    const finalHasEventDeviceIds = new Set(finalHasEventDeviceIdsRes.rows.map(r => r.DeviceID));

    // 6. Create missing events for devices in the batch that still have no event for this report
    const missingPlans = plans.filter(p => !finalHasEventDeviceIds.has(p.deviceId));
    
    // Deduplicate missingPlans by deviceId to prevent duplicate events if plans contains duplicates
    const uniqueMissingPlans = Array.from(new Map(missingPlans.map((p: any) => [p.deviceId, p])).values());

    if (uniqueMissingPlans.length > 0) {
      const metadata: any = {
        source: 'damage-report-sync',
        damageReportId: reportId,
        maintenanceBatchId: batchId,
        syncAt: now.toISOString(),
      };
      
      const eventPromises = uniqueMissingPlans.map((plan: any) => {
        // Extract plain-text content from handlerNotes JSON timeline (avoid storing raw JSON in Event.notes)
        const rawNotes = options?.handlerNotes || report.HandlerNotes || '';
        let eventNotes = '';
        if (rawNotes) {
          try {
            if (typeof rawNotes === 'string' && rawNotes.trim().startsWith('[')) {
              const tl = JSON.parse(rawNotes);
              if (Array.isArray(tl) && tl.length > 0) {
                const userEntries = tl.filter((e: any) => e.type !== 'auto');
                const lastEntry = userEntries.length > 0 ? userEntries[userEntries.length - 1] : tl[tl.length - 1];
                eventNotes = lastEntry?.content || '';
              }
            } else {
              eventNotes = rawNotes;
            }
          } catch { eventNotes = rawNotes; }
        }
        
        // Truncate to 200 chars max to fit Event.Notes varchar(200) constraint
        eventNotes = eventNotes.substring(0, 200);

        return eventService.create({
          title: options?.eventTitle || (plan.deviceName 
            ? `Bảo trì định kỳ - ${plan.deviceName}` 
            : `Bảo trì định kỳ - ${plan.title || options?.damageContent || report.DamageContent || 'Bảo trì'}`),
          deviceId: plan.deviceId,
          eventTypeId: options?.eventTypeId || plan.eventTypeId || 1,
          description: options?.eventDescription || options?.damageContent || report.DamageContent || plan.title || '',
          notes: eventNotes,
          status: mappedStatus,
          eventDate: now,
          startDate: options?.handlingDate ? new Date(options?.handlingDate) : (s === DamageReportStatus.InProgress || s === DamageReportStatus.Completed ? now : null),
          endDate: (s === DamageReportStatus.Completed || s === DamageReportStatus.Cancelled || s === DamageReportStatus.Rejected) ? now : null,
          staffId: options?.handlerId || report.HandlerID || null,
          relatedReportId: reportId,
          metadata,
          createdBy: userId,
          createdAt: now,
          updatedBy: userId || null,
          updatedAt: now,
        });
      });

      await Promise.all(eventPromises);
    }

    // 7. If status is Completed, bump nextDueDate for ALL plans in this batch
    if (s === DamageReportStatus.Completed) {
      console.log(`Bumping nextDueDate for batch ${batchId} due to report ${reportId} completion`);
      
      const { calculateNextDueDate } = require('../utils/maintenanceScheduler');

      const planUpdatePromises = plans.map((plan: any) => {
        if (!plan.intervalValue || !plan.intervalUnit) {
          console.log(`Skipping plan ${plan.id} - no interval defined`);
          return Promise.resolve();
        }

        // Use the plan's existing nextDueDate as the base, or fallback to today if missing
        const baseDate = plan.nextDueDate ? new Date(plan.nextDueDate) : new Date(now);
        baseDate.setHours(0, 0, 0, 0);
        
        let scheduleConfig = null;
        if (plan.metadata) {
          try {
            const meta = typeof plan.metadata === 'string' ? JSON.parse(plan.metadata) : plan.metadata;
            scheduleConfig = meta.scheduleConfig || null;
          } catch(e) {}
        }

        const correctNextDueDate = calculateNextDueDate(
          baseDate,
          plan.intervalValue,
          plan.intervalUnit,
          scheduleConfig,
          false
        );

        return pool.query(
          `UPDATE "DeviceReminderPlan" 
           SET "NextDueDate" = $1, "LastTriggeredAt" = $2, "UpdatedAt" = CURRENT_TIMESTAMP, "UpdatedBy" = $3
           WHERE "ID" = $4`,
          [correctNextDueDate, now, userId, plan.id]
        );
      });

      await Promise.all(planUpdatePromises);
      console.log(`Successfully bumped ${plans.length} plans for batch ${batchId}`);

      // Notify about maintenance completion
      try {
        const handlerRes = await pool.query('SELECT "Name" FROM "Staff" WHERE "ID" = $1', [report.HandlerID]);
        const handlerName = handlerRes.rows[0]?.Name || 'Nhân viên';
        const batchTitle = plans[0]?.title || 'Đợt bảo trì';

        const notificationService = new NotificationService();
        await notificationService.createNotification({
          title: 'Bảo trì đã thực hiện 🔧',
          content: `${handlerName} đã hoàn thành bảo trì: ${batchTitle}`,
          type: NotificationType.Maintenance,
          category: NotificationCategory.Completed,
          targetUrl: `/dashboard/maintenance`,
          createdBy: userId || undefined
        });
      } catch (err) {
        console.error('Error sending maintenance completion notification:', err);
      }
    }
  }

  // Centralized robust sync method
  private async syncDeviceStatus(deviceId: any, clientToUse?: any): Promise<void> {
    if (!deviceId) return;
    const deviceIdNum = parseInt(deviceId.toString());
    if (isNaN(deviceIdNum)) return;

    const dbClient = clientToUse || pool;
    
    try {
      // Find ALL active reports for this device to determine the most critical status
      // We query for Pending (1), Assigned (2), and InProgress (3)
      // Using ::text and numeric IN for maximum compatibility with different column types
      const res = await dbClient.query(
        `SELECT CAST("Status"::text AS INTEGER) as status
         FROM "DamageReport" 
         WHERE "DeviceID" = $1 AND "Status"::text IN ('1', '2', '3')`,
        [deviceIdNum]
      );

      const activeStatuses = res.rows.map((r: any) => r.status);
      
      let newStatus: number = DeviceStatus.DangSuDung; // Default (1)
      
      if (activeStatuses.includes(DamageReportStatus.InProgress)) {
        // Any report is InProgress (3) -> Device is Under Repair (2)
        newStatus = DeviceStatus.DangSuaChua;
      } else if (activeStatuses.length > 0) {
        // No InProgress, but some are Pending (1) or Assigned (2) -> Device has Damage (5)
        newStatus = DeviceStatus.CoHuHong;
      }

      await dbClient.query(
        `UPDATE "Device" SET "Status" = $1 WHERE "ID" = $2`,
        [newStatus.toString(), deviceIdNum]
      );
      console.log(`Sync success: Device ${deviceIdNum} status updated to ${newStatus}`);
    } catch (err) {
      console.error('syncDeviceStatus failed:', err);
    }
  }

  /**
   * Get data for daily summary report
   * Uses DailyWorkLog for accurate "active today" section
   * @param dateStr - date in 'YYYY-MM-DD' format (local date)
   */
  async getDailyReportData(dateStr: string, filters?: { departmentId?: number, handlerId?: number, maintenanceBatchId?: string, search?: string }): Promise<{
    newReports: DamageReportVM[];
    activeReports: DamageReportVM[];
    completedReports: DamageReportVM[];
    pendingReports: DamageReportVM[];
    pendingActiveReports: DamageReportVM[];
    summary: {
      totalNew: number;
      totalActive: number;
      totalCompleted: number;
      totalPending: number;
      totalPendingActive: number;
    }
  }> {
    // Parse as local date components to avoid UTC timezone shift
    const [y, m, d] = dateStr.split('-').map(Number);
    const from = new Date(y, m - 1, d, 0, 0, 0, 0);
    const to = new Date(y, m - 1, d, 23, 59, 59, 999);
    const workDateStr = dateStr; // Already 'YYYY-MM-DD'

    let filterClause = '';
    const queryParams: any[] = [];
    let paramIdx = 1;

    if (filters?.departmentId && filters.departmentId > 0) {
      filterClause += ` AND handler."DepartmentID" = $${paramIdx++}`;
      queryParams.push(filters.departmentId);
    }
    if (filters?.handlerId && filters.handlerId > 0) {
      filterClause += ` AND dr."HandlerID" = $${paramIdx++}`;
      queryParams.push(filters.handlerId);
    }
    if (filters?.maintenanceBatchId) {
      if (filters.maintenanceBatchId === 'only-maintenance') {
        filterClause += ` AND dr."MaintenanceBatchId" IS NOT NULL`;
      } else if (filters.maintenanceBatchId === 'none-maintenance') {
        filterClause += ` AND dr."MaintenanceBatchId" IS NULL`;
      } else {
        filterClause += ` AND dr."MaintenanceBatchId" = $${paramIdx++}`;
        queryParams.push(filters.maintenanceBatchId);
      }
    }

    if (filters?.search) {
      filterClause += ` AND (
        dr."DamageContent" ILIKE $${paramIdx} OR
        dr."DamageLocation" ILIKE $${paramIdx} OR
        d."Name" ILIKE $${paramIdx} OR
        reporter."Name" ILIKE $${paramIdx} OR
        handler."Name" ILIKE $${paramIdx}
      )`;
      queryParams.push(`%${filters.search}%`);
      paramIdx++;
    }

    // 1. New reports (Việc mới phát sinh hôm nay): created today, NOT handled/completed today
    const newReportsRes = await pool.query(
      `SELECT 
         dr."ID" as id, dr."DeviceID" as "deviceId", dr."DamageLocation" as "damageLocation",
         dr."ReporterID" as "reporterId", dr."ReportingDepartmentID" as "reportingDepartmentId",
         dr."HandlerID" as "handlerId", dr."ReportDate" as "reportDate",
         dr."HandlingDate" as "handlingDate", dr."CompletedDate" as "completedDate",
         dr."DamageContent" as "damageContent",
         dr."MaintenanceBatchId" as "maintenanceBatchId",
         CAST(dr."Status"::text AS INTEGER) as status,
         CAST(dr."Priority"::text AS INTEGER) as priority,
         dr."Notes" as notes, dr."HandlerNotes" as "handlerNotes",
         d."Name" as "deviceName",
         reporter."Name" as "reporterName",
         handler."Name" as "handlerName",
         handler_dept."Name" as "handlerDepartmentName",
         loc."Name" as "deviceLocationName",
         cat."Name" as "deviceCategoryName"
       FROM "DamageReport" dr
       LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
       LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
       LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
       LEFT JOIN "Department" handler_dept ON handler."DepartmentID" = handler_dept."ID"
       LEFT JOIN "Location" loc ON d."LocationID" = loc."ID"
       LEFT JOIN "DeviceCategory" cat ON d."DeviceCategoryID" = cat."ID"
       WHERE dr."ReportDate" >= $${paramIdx} AND dr."ReportDate" <= $${paramIdx + 1}
         AND dr."ID" NOT IN (
           -- Exclude reports handled today (Status 3 + activity)
           SELECT dr2."ID" 
           FROM "DamageReport" dr2
           LEFT JOIN "DailyWorkLog" dwl ON dwl."DamageReportID" = dr2."ID" AND dwl."WorkDate" = $${paramIdx + 2}::date
           WHERE CAST(dr2."Status"::text AS INTEGER) = 3
             AND (dwl."DamageReportID" IS NOT NULL OR dr2."HandlerNotes" LIKE '%' || $${paramIdx + 2} || '%')
         )
         AND dr."ID" NOT IN (
           -- Exclude reports completed today
           SELECT dr3."ID" 
           FROM "DamageReport" dr3
           WHERE CAST(dr3."Status"::text AS INTEGER) = 4
             AND dr3."CompletedDate" >= $${paramIdx} AND dr3."CompletedDate" <= $${paramIdx + 1}
         )
       ${filterClause}
       ORDER BY dr."ReportDate" DESC`,
      [...queryParams, from, to, workDateStr]
    );

    // 2. Active reports (Việc đang xử lý có checkin trong ngày)
    let activeFilterClause = filterClause;
    const activeParams = [...queryParams, workDateStr];
    const activeDateIdx = activeParams.length;

    if (filters?.handlerId && filters.handlerId > 0) {
       activeFilterClause = activeFilterClause.replace(`dr."HandlerID" =`, `COALESCE(dwl."StaffID", dr."HandlerID") =`);
    }
    if (filters?.departmentId && filters.departmentId > 0) {
       activeFilterClause = activeFilterClause.replace(`handler."DepartmentID" =`, `COALESCE(s."DepartmentID", handler."DepartmentID") =`);
    }

    const activeReportsRes = await pool.query(
      `SELECT 
         dr."ID" as id, dr."DeviceID" as "deviceId", dr."DamageLocation" as "damageLocation",
         dr."ReporterID" as "reporterId", dr."ReportingDepartmentID" as "reportingDepartmentId",
         dr."HandlerID" as "handlerId", dr."ReportDate" as "reportDate",
         dr."HandlingDate" as "handlingDate", dr."CompletedDate" as "completedDate",
         dr."DamageContent" as "damageContent",
         dr."MaintenanceBatchId" as "maintenanceBatchId",
         CAST(dr."Status"::text AS INTEGER) as status,
         CAST(dr."Priority"::text AS INTEGER) as priority,
         dr."Notes" as notes, dr."HandlerNotes" as "handlerNotes",
         d."Name" as "deviceName",
         reporter."Name" as "reporterName",
         handler."Name" as "handlerName",
         handler_dept."Name" as "handlerDepartmentName",
         loc."Name" as "deviceLocationName",
         cat."Name" as "deviceCategoryName",
         dwl."Notes" as "workNotes",
         s."Name" as "checkinStaffName"
       FROM "DamageReport" dr
       LEFT JOIN "DailyWorkLog" dwl ON dwl."DamageReportID" = dr."ID" AND dwl."WorkDate" = $${activeDateIdx}::date
       LEFT JOIN "Staff" s ON dwl."StaffID" = s."ID"
       LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
       LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
       LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
       LEFT JOIN "Department" handler_dept ON handler."DepartmentID" = handler_dept."ID"
       LEFT JOIN "Location" loc ON d."LocationID" = loc."ID"
       LEFT JOIN "DeviceCategory" cat ON d."DeviceCategoryID" = cat."ID"
       WHERE CAST(dr."Status"::text AS INTEGER) = 3
         AND (
           dwl."DamageReportID" IS NOT NULL 
           OR (dr."HandlerNotes" IS NOT NULL AND dr."HandlerNotes" LIKE '%' || $${activeDateIdx} || '%')
         )
       ${activeFilterClause}
       ORDER BY dr."ReportDate" ASC`,
      activeParams
    );

    // 3. Completed reports (Việc hoàn thành trong ngày)
    const completedReportsRes = await pool.query(
      `SELECT 
         dr."ID" as id, dr."DeviceID" as "deviceId", dr."DamageLocation" as "damageLocation",
         dr."ReporterID" as "reporterId", dr."ReportingDepartmentID" as "reportingDepartmentId",
         dr."HandlerID" as "handlerId", dr."ReportDate" as "reportDate",
         dr."HandlingDate" as "handlingDate", dr."CompletedDate" as "completedDate",
         dr."DamageContent" as "damageContent",
         dr."MaintenanceBatchId" as "maintenanceBatchId",
         CAST(dr."Status"::text AS INTEGER) as status,
         CAST(dr."Priority"::text AS INTEGER) as priority,
         dr."Notes" as notes, dr."HandlerNotes" as "handlerNotes",
         d."Name" as "deviceName",
         reporter."Name" as "reporterName",
         handler."Name" as "handlerName",
         handler_dept."Name" as "handlerDepartmentName",
         loc."Name" as "deviceLocationName",
         cat."Name" as "deviceCategoryName"
       FROM "DamageReport" dr
       LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
       LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
       LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
       LEFT JOIN "Department" handler_dept ON handler."DepartmentID" = handler_dept."ID"
       LEFT JOIN "Location" loc ON d."LocationID" = loc."ID"
       LEFT JOIN "DeviceCategory" cat ON d."DeviceCategoryID" = cat."ID"
       WHERE CAST(dr."Status"::text AS INTEGER) = 4
         AND dr."CompletedDate" >= $${paramIdx} AND dr."CompletedDate" <= $${paramIdx + 1}
         ${filterClause}
       ORDER BY dr."CompletedDate" DESC`,
      [...queryParams, from, to]
    );

    // 4. Pending Reports (Việc chờ xử lý):
    // Reports that were not yet handled (or handled after 'to') and not completed by 'to'
    const pendingReportsRes = await pool.query(
      `SELECT 
         dr."ID" as id, dr."DeviceID" as "deviceId", dr."DamageLocation" as "damageLocation",
         dr."ReporterID" as "reporterId", dr."ReportingDepartmentID" as "reportingDepartmentId",
         dr."HandlerID" as "handlerId", dr."ReportDate" as "reportDate",
         dr."HandlingDate" as "handlingDate", dr."CompletedDate" as "completedDate",
         dr."DamageContent" as "damageContent",
         dr."MaintenanceBatchId" as "maintenanceBatchId",
         CAST(dr."Status"::text AS INTEGER) as status,
         CAST(dr."Priority"::text AS INTEGER) as priority,
         dr."Notes" as notes, dr."HandlerNotes" as "handlerNotes",
         d."Name" as "deviceName",
         reporter."Name" as "reporterName",
         handler."Name" as "handlerName",
         handler_dept."Name" as "handlerDepartmentName",
         loc."Name" as "deviceLocationName",
         cat."Name" as "deviceCategoryName"
       FROM "DamageReport" dr
       LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
       LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
       LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
       LEFT JOIN "Department" handler_dept ON handler."DepartmentID" = handler_dept."ID"
       LEFT JOIN "Location" loc ON d."LocationID" = loc."ID"
       LEFT JOIN "DeviceCategory" cat ON d."DeviceCategoryID" = cat."ID"
       WHERE dr."ReportDate" <= $${paramIdx}
       AND (
         (dr."HandlingDate" IS NULL AND CAST(dr."Status"::text AS INTEGER) IN (1, 2))
         OR dr."HandlingDate" > $${paramIdx}
       )
       AND (
         (dr."CompletedDate" IS NULL AND CAST(dr."Status"::text AS INTEGER) NOT IN (4, 5, 6))
         OR dr."CompletedDate" > $${paramIdx}
       )
       ${filterClause}
       ORDER BY dr."ReportDate" DESC`,
      [...queryParams, to]
    );

    // 5. Pending Active Reports (Việc đang xử lý):
    // Reports that were being handled at filter date but not yet completed
    const pendingActiveReportsRes = await pool.query(
      `SELECT 
         dr."ID" as id, dr."DeviceID" as "deviceId", dr."DamageLocation" as "damageLocation",
         dr."ReporterID" as "reporterId", dr."ReportingDepartmentID" as "reportingDepartmentId",
         dr."HandlerID" as "handlerId", dr."ReportDate" as "reportDate",
         dr."HandlingDate" as "handlingDate", dr."CompletedDate" as "completedDate",
         dr."DamageContent" as "damageContent",
         dr."MaintenanceBatchId" as "maintenanceBatchId",
         CAST(dr."Status"::text AS INTEGER) as status,
         CAST(dr."Priority"::text AS INTEGER) as priority,
         dr."Notes" as notes, dr."HandlerNotes" as "handlerNotes",
         d."Name" as "deviceName",
         reporter."Name" as "reporterName",
         handler."Name" as "handlerName",
         handler_dept."Name" as "handlerDepartmentName",
         loc."Name" as "deviceLocationName",
         cat."Name" as "deviceCategoryName"
       FROM "DamageReport" dr
       LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
       LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
       LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
       LEFT JOIN "Department" handler_dept ON handler."DepartmentID" = handler_dept."ID"
       LEFT JOIN "Location" loc ON d."LocationID" = loc."ID"
       LEFT JOIN "DeviceCategory" cat ON d."DeviceCategoryID" = cat."ID"
       WHERE dr."ReportDate" <= $${paramIdx}
       AND (
         (dr."HandlingDate" IS NOT NULL AND dr."HandlingDate" <= $${paramIdx})
         OR (dr."HandlingDate" IS NULL AND CAST(dr."Status"::text AS INTEGER) = 3)
       )
       AND (
         (dr."CompletedDate" IS NULL AND CAST(dr."Status"::text AS INTEGER) NOT IN (4, 5, 6))
         OR dr."CompletedDate" > $${paramIdx}
       )
       ${filterClause}
       ORDER BY dr."ReportDate" DESC`,
      [...queryParams, to]
    );

    const mapRow = (r: any): DamageReportVM => ({
      id: r.id,
      deviceId: r.deviceId,
      damageLocation: r.damageLocation,
      reporterId: r.reporterId,
      reportingDepartmentId: r.reportingDepartmentId,
      handlerId: r.handlerId,
      reportDate: r.reportDate,
      handlingDate: r.handlingDate,
      completedDate: r.completedDate,
      damageContent: r.damageContent,
      status: r.status,
      priority: r.priority,
      notes: r.notes,
      handlerNotes: r.handlerNotes,
      maintenanceBatchId: r.maintenanceBatchId,
      deviceName: r.deviceName,
      reporterName: r.reporterName,
      handlerName: r.handlerName,
      handlerDepartmentName: r.handlerDepartmentName,
      deviceLocationName: r.deviceLocationName,
      deviceCategoryName: r.deviceCategoryName,
      workNotes: r.workNotes,
      checkinStaffName: r.checkinStaffName,
      statusName: this.getStatusName(r.status),
      priorityName: this.getPriorityName(r.priority),
    } as any);

    return {
      newReports: newReportsRes.rows.map(mapRow),
      activeReports: activeReportsRes.rows.map(mapRow),
      completedReports: completedReportsRes.rows.map(mapRow),
      pendingReports: pendingReportsRes.rows.map(mapRow),
      pendingActiveReports: pendingActiveReportsRes.rows.map(mapRow),
      summary: {
        totalNew: newReportsRes.rows.length,
        totalActive: activeReportsRes.rows.length,
        totalCompleted: completedReportsRes.rows.length,
        totalPending: pendingReportsRes.rows.length,
        totalPendingActive: pendingActiveReportsRes.rows.length,
      }
    };
  }
}

