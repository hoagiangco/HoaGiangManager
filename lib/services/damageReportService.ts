import pool from '../db';
import { PoolClient } from 'pg';
import { DamageReport, DamageReportVM, DamageReportStatus, DamageReportPriority, DeviceStatus, EventStatus } from '@/types';
import { EventService } from './eventService';
import { NotificationService, NotificationType, NotificationCategory } from './notificationService';

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
    status?: DamageReportStatus;
    priority?: DamageReportPriority;
    deviceId?: number;
    reporterId?: number;
    handlerId?: number;
    departmentId?: number;
    locationId?: number;
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

      if (filters.locationId) {
        // Filter reports where the device's location matches
        query += ` AND d."LocationID" = $${paramIndex}`;
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
    }

    query += ` ORDER BY dr."ReportDate" DESC, dr."ID" DESC`;

    const result = await pool.query(query, params);

    return result.rows.map((row: any) => this.mapRowToVM(row));
  }

  async getPaginated(filters: {
    page: number;
    limit: number;
    status?: DamageReportStatus;
    priority?: DamageReportPriority;
    deviceId?: number;
    reporterId?: number;
    handlerId?: number;
    departmentId?: number;
    locationId?: number;
    search?: string;
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
      params.push(status.toString());
      whereClause += ` AND dr."Status" = $${params.length}`;
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
      whereClause += ` AND dr."ReportingDepartmentID" = $${params.length}`;
    }

    if (locationId) {
      params.push(locationId);
      whereClause += ` AND (d."LocationID" = $${params.length} OR dr."DamageLocation" ILIKE (SELECT "Name" FROM "Location" WHERE "ID" = $${params.length}))`;
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
          loc."Name" as "deviceLocationName",
          updated_user."FullName" as "updatedByName"
        FROM "DamageReport" dr
        LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
        LEFT JOIN "Staff" reporter ON dr."ReporterID" = reporter."ID"
        LEFT JOIN "Department" reporter_dept ON dr."ReportingDepartmentID" = reporter_dept."ID"
        LEFT JOIN "Staff" handler ON dr."HandlerID" = handler."ID"
        LEFT JOIN "Department" handler_dept ON handler."DepartmentID" = handler_dept."ID"
      LEFT JOIN "Location" loc ON d."LocationID" = loc."ID"
        LEFT JOIN "Location" loc ON d."LocationID" = loc."ID"
        LEFT JOIN "AspNetUsers" updated_user ON dr."UpdatedBy" = updated_user."Id"
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
      afterImages: row.afterImages ? (Array.isArray(row.afterImages) ? row.afterImages : JSON.parse(row.afterImages)) : [],
      statusName: this.getStatusName(status),
      priorityName: this.getPriorityName(priority),
      daysSinceReport,
      daysInProgress,
      isOverdue,
      displayLocation: row.deviceName || row.maintenanceBatchTitle || row.damageLocation || 'Không xác định',
      deviceLocationName: row.deviceLocationName || null,
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
      displayLocation: row.deviceName || row.maintenanceBatchTitle || row.damageLocation || 'Không xác định',
    } as DamageReportVM;
  }

  async create(report: Omit<DamageReport, 'id'>): Promise<number> {
    // Validate: Must have deviceId OR damageLocation OR maintenanceBatchId
    if (!report.deviceId && (!report.damageLocation || report.damageLocation.trim() === '') && !report.maintenanceBatchId) {
      throw new Error('Phải chọn thiết bị hoặc nhập vị trí hư hỏng');
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
        report.reportDate || new Date(),
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
        title: 'Báo cáo hư hỏng mới ⚠️',
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
    // Validate: Must have deviceId OR damageLocation OR maintenanceBatchId
    if (!report.deviceId && (!report.damageLocation || report.damageLocation.trim() === '') && !report.maintenanceBatchId) {
      throw new Error('Phải chọn thiết bị hoặc nhập vị trí hư hỏng');
    }

    // Get current values to track changes
    const currentResult = await pool.query(
      `SELECT "Status", "Priority", "DeviceID", "HandlerID", "DamageContent" FROM "DamageReport" WHERE "ID" = $1`,
      [report.id]
    );
    
    const currentStatus = currentResult.rows[0]?.Status;
    const currentPriority = currentResult.rows[0]?.Priority;
    const currentHandlerId = currentResult.rows[0]?.HandlerID;
    const currentContent = currentResult.rows[0]?.DamageContent;
    const oldDeviceId = currentResult.rows[0]?.DeviceID;

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
                dr."DamageContent" as damage_content, s."Name" as handler_name
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

      // Update report status
      await client.query(
        `UPDATE "DamageReport" SET "Status" = $1, "UpdatedBy" = $2, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $3`,
        [status.toString(), updatedBy, id]
      );

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

    // 1. Update events ALREADY linked to this report (strict match)
    await pool.query(
      `UPDATE "Event" 
       SET "Status" = $1, "UpdatedAt" = CURRENT_TIMESTAMP ${startDateUpdate} ${endDateUpdate}
       WHERE "RelatedReportID" = $2`,
      [mappedStatus, reportId]
    );

    // 2. Identify devices in the batch that already have an event for THIS report
    const hasEventDeviceIdsRes = await pool.query(
      `SELECT "DeviceID" FROM "Event" WHERE "RelatedReportID" = $1`,
      [reportId]
    );
    const hasEventDeviceIds = new Set(hasEventDeviceIdsRes.rows.map(r => r.DeviceID));

    // 3. Update existing UNLINKED non-completed events for this batch (loose match)
    // This handles cases where events were created by the scheduler but not yet linked to a report
    await pool.query(
      `UPDATE "Event" 
       SET "Status" = $1, "UpdatedAt" = CURRENT_TIMESTAMP ${startDateUpdate} ${endDateUpdate},
           "RelatedReportID" = $2
       WHERE ("Metadata"::text LIKE $3 OR ("Metadata"->>'maintenanceBatchId') = $4)
         AND "RelatedReportID" IS NULL`,
      [mappedStatus, reportId, metadataFilter, batchId]
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

    if (missingPlans.length > 0) {
      const metadata: any = {
        source: 'damage-report-sync',
        damageReportId: reportId,
        maintenanceBatchId: batchId,
        syncAt: now.toISOString(),
      };
      
      const eventPromises = missingPlans.map((plan: any) => {
        return eventService.create({
          title: options?.eventTitle || (plan.deviceName 
            ? `Bảo trì định kỳ - ${plan.deviceName}` 
            : `Bảo trì định kỳ - ${plan.title || options?.damageContent || report.DamageContent || 'Bảo trì'}`),
          deviceId: plan.deviceId,
          eventTypeId: options?.eventTypeId || plan.eventTypeId || 1,
          description: options?.eventDescription || options?.damageContent || report.DamageContent || plan.title || '',
          notes: options?.handlerNotes || report.HandlerNotes || '',
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
      
      const planUpdatePromises = plans.map((plan: any) => {
        if (!plan.intervalValue || !plan.intervalUnit) {
          console.log(`Skipping plan ${plan.id} - no interval defined`);
          return Promise.resolve();
        }

        const correctNextDueDate = new Date(now);
        correctNextDueDate.setHours(0, 0, 0, 0);
        
        if (plan.intervalUnit === 'day') {
          correctNextDueDate.setDate(correctNextDueDate.getDate() + plan.intervalValue);
        } else if (plan.intervalUnit === 'week') {
          correctNextDueDate.setDate(correctNextDueDate.getDate() + plan.intervalValue * 7);
        } else if (plan.intervalUnit === 'month') {
          correctNextDueDate.setMonth(correctNextDueDate.getMonth() + plan.intervalValue);
        } else if (plan.intervalUnit === 'year') {
          correctNextDueDate.setFullYear(correctNextDueDate.getFullYear() + plan.intervalValue);
        }

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
   */
  async getDailyReportData(date: Date): Promise<{
    newReports: DamageReportVM[];
    completedReports: DamageReportVM[];
    pendingReports: DamageReportVM[];
    summary: {
      totalNew: number;
      totalCompleted: number;
      totalPending: number;
    }
  }> {
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);

    // Get all reports in one go 
    const allReports = await this.getAll({ isAdmin: true });
    
    // 1. New reports today
    const filteredNew = allReports.filter(r => {
      if (!r.reportDate) return false;
      const d = new Date(r.reportDate);
      return d >= from && d <= to;
    });

    // 2. Completed reports today
    const filteredCompleted = allReports.filter(r => {
      if (!r.completedDate || r.status !== DamageReportStatus.Completed) return false;
      const d = new Date(r.completedDate);
      return d >= from && d <= to;
    });

    // 3. All pending/in-progress reports (snapshot of current state)
    const pendingReports = allReports.filter(r => 
      [DamageReportStatus.Pending, DamageReportStatus.Assigned, DamageReportStatus.InProgress].includes(r.status)
    );

    return {
      newReports: filteredNew,
      completedReports: filteredCompleted,
      pendingReports: pendingReports,
      summary: {
        totalNew: filteredNew.length,
        totalCompleted: filteredCompleted.length,
        totalPending: pendingReports.length
      }
    };
  }
}

