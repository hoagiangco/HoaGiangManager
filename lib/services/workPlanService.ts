import pool from '../db';
import { PoolClient } from 'pg';
import { WorkPlanItem, WorkPlanItemVM, DamageReportStatus, DamageReportPriority, WorkPlanDraftData } from '@/types';
import { getVNNow } from '../utils/dateFormat';

let archiveSchemaReady = false;

export class WorkPlanService {
  private async ensureArchiveSchema(): Promise<void> {
    if (archiveSchemaReady) return;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT pg_advisory_xact_lock(hashtext('work_plan_archive_schema'))`);

      const columnResult = await client.query(
        `SELECT is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'WorkPlanItem'
           AND column_name = 'PlanDate'`
      );

      if (columnResult.rows[0]?.is_nullable === 'NO') {
        await client.query('ALTER TABLE "WorkPlanItem" ALTER COLUMN "PlanDate" DROP NOT NULL');
      }

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_work_plan_item_archive
          ON "WorkPlanItem"("StaffID", "CreatedAt")
          WHERE "PlanDate" IS NULL AND "IsImplemented" = false
      `);

      await client.query('COMMIT');
      archiveSchemaReady = true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private mapRowToVM(row: any): WorkPlanItemVM {
    return {
      id: row.id,
      planDate: row.planDate,
      staffId: row.staffId,
      damageReportId: row.damageReportId,
      isNewTask: row.isNewTask,
      title: row.title,
      draftData: row.draftData,
      isImplemented: row.isImplemented,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      staffName: row.staffName,
      reportStatus: row.reportStatus ? parseInt(row.reportStatus) : undefined,
      reportStatusName: row.reportStatusName,
      reportHandlerId: row.reportHandlerId,
      reportHandlerName: row.reportHandlerName,
      deviceName: row.deviceName,
      location: row.location,
      deptName: row.deptName,
      damageContent: row.damageContent,
      maintenanceBatchId: row.maintenanceBatchId,
      maintenanceTitle: row.maintenanceTitle,
    };
  }

  private applyStatusLabel(vm: WorkPlanItemVM): WorkPlanItemVM {
    const statusLabels: Record<number, string> = {
      [DamageReportStatus.Pending]: 'Chờ xử lý',
      [DamageReportStatus.Assigned]: 'Đã phân công',
      [DamageReportStatus.InProgress]: 'Đang xử lý',
      [DamageReportStatus.Completed]: 'Hoàn thành',
      [DamageReportStatus.Cancelled]: 'Đã hủy',
      [DamageReportStatus.Rejected]: 'Từ chối',
    };

    if (vm.reportStatus) {
      vm.reportStatusName = statusLabels[vm.reportStatus] || 'Không xác định';
    }
    return vm;
  }

  private getListQuery(planDateFilter: string, staffParam: string = '$2'): string {
    return `SELECT
        wpi."ID" as id,
        wpi."PlanDate" as "planDate",
        wpi."StaffID" as "staffId",
        wpi."DamageReportID" as "damageReportId",
        wpi."IsNewTask" as "isNewTask",
        wpi."Title" as title,
        wpi."DraftData" as "draftData",
        wpi."IsImplemented" as "isImplemented",
        wpi."CreatedBy" as "createdBy",
        wpi."CreatedAt" as "createdAt",
        wpi."UpdatedAt" as "updatedAt",
        s."Name" as "staffName",
        dr."Status" as "reportStatus",
        dr."DamageLocation" as "location",
        dr."DamageContent" as "damageContent",
        dr."MaintenanceBatchId" as "maintenanceBatchId",
        COALESCE(
          (SELECT "Title" FROM "DeviceReminderPlan" WHERE "Metadata"->>'maintenanceBatchId' = dr."MaintenanceBatchId" LIMIT 1),
          (SELECT "Title" FROM "Event" WHERE "Metadata"->>'maintenanceBatchId' = dr."MaintenanceBatchId" LIMIT 1)
        ) as "maintenanceTitle",
        dr."HandlerID" as "reportHandlerId",
        h."Name" as "reportHandlerName",
        dep."Name" as "deptName",
        d."Name" as "deviceName"
      FROM "WorkPlanItem" wpi
      LEFT JOIN "Staff" s ON wpi."StaffID" = s."ID"
      LEFT JOIN "DamageReport" dr ON wpi."DamageReportID" = dr."ID"
      LEFT JOIN "Staff" h ON dr."HandlerID" = h."ID"
      LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
      LEFT JOIN "Department" dep ON dr."ReportingDepartmentID" = dep."ID"
      WHERE ${planDateFilter}
        AND (COALESCE(dr."HandlerID", wpi."StaffID") = ${staffParam} OR ${staffParam} = 0)
      ORDER BY wpi."ID" ASC`;
  }

  async list(date: string, staffId: number): Promise<WorkPlanItemVM[]> {
    const result = await pool.query(
      this.getListQuery('wpi."PlanDate" = $1'),
      [date, staffId]
    );

    return result.rows.map(row => this.applyStatusLabel(this.mapRowToVM(row)));
  }

  async listArchive(staffId: number): Promise<WorkPlanItemVM[]> {
    await this.ensureArchiveSchema();

    const result = await pool.query(
      this.getListQuery('wpi."PlanDate" IS NULL AND wpi."IsImplemented" = false', '$1'),
      [staffId]
    );

    return result.rows.map(row => this.applyStatusLabel(this.mapRowToVM(row)));
  }

  async getActiveDates(startDate: string, endDate: string, staffId: number): Promise<string[]> {
    const query = {
      text: `SELECT DISTINCT wpi."PlanDate"
             FROM "WorkPlanItem" wpi
             LEFT JOIN "DamageReport" dr ON wpi."DamageReportID" = dr."ID"
             WHERE wpi."PlanDate" IS NOT NULL
             AND wpi."PlanDate" >= $1 AND wpi."PlanDate" <= $2
             ${staffId > 0 ? 'AND COALESCE(dr."HandlerID", wpi."StaffID") = $3' : ''}`,
      values: staffId > 0 ? [startDate, endDate, staffId] : [startDate, endDate]
    };
    const result = await pool.query(query.text, query.values);
    return result.rows.map(r => {
      const date = new Date(r.PlanDate);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
  }

  async getOverdueUnimplemented(staffId: number, isAdmin: boolean = false): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        wpi."ID" as id,
        wpi."PlanDate" as "planDate",
        wpi."StaffID" as "staffId",
        wpi."DamageReportID" as "damageReportId",
        wpi."IsNewTask" as "isNewTask",
        wpi."Title" as title,
        wpi."DraftData" as "draftData",
        wpi."IsImplemented" as "isImplemented",
        wpi."CreatedBy" as "createdBy",
        wpi."CreatedAt" as "createdAt",
        s."Name" as "staffName",
        dr."Status" as "reportStatus",
        dr."DamageLocation" as location,
        dr."DamageContent" as "damageContent",
        dr."MaintenanceBatchId" as "maintenanceBatchId",
        COALESCE(
          (SELECT "Title" FROM "DeviceReminderPlan" WHERE "Metadata"->>'maintenanceBatchId' = dr."MaintenanceBatchId" LIMIT 1),
          (SELECT "Title" FROM "Event" WHERE "Metadata"->>'maintenanceBatchId' = dr."MaintenanceBatchId" LIMIT 1)
        ) as "maintenanceTitle",
        dr."HandlerID" as "reportHandlerId",
        h."Name" as "reportHandlerName",
        d."Name" as "deviceName"
      FROM "WorkPlanItem" wpi
      LEFT JOIN "Staff" s ON wpi."StaffID" = s."ID"
      LEFT JOIN "DamageReport" dr ON wpi."DamageReportID" = dr."ID"
      LEFT JOIN "Staff" h ON dr."HandlerID" = h."ID"
      LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
      WHERE wpi."PlanDate" IS NOT NULL
        AND wpi."PlanDate" < CURRENT_DATE
        AND wpi."IsImplemented" = false
        AND wpi."IsNewTask" = true
        ${isAdmin ? '' : 'AND (COALESCE(dr."HandlerID", wpi."StaffID") = $1 OR $1 = 0)'}
      ORDER BY wpi."PlanDate" DESC, wpi."ID" ASC`,
      isAdmin ? [] : [staffId]
    );
    return result.rows;
  }

  async getPendingReports(staffId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        dr."ID" as id,
        dr."DamageContent" as content,
        dr."DamageLocation" as location,
        dr."ReportDate" as "reportDate",
        dr."Status" as status,
        dr."HandlerID" as "handlerId",
        dr."MaintenanceBatchId" as "maintenanceBatchId",
        COALESCE(
          (SELECT "Title" FROM "DeviceReminderPlan" WHERE "Metadata"->>'maintenanceBatchId' = dr."MaintenanceBatchId" LIMIT 1),
          (SELECT "Title" FROM "Event" WHERE "Metadata"->>'maintenanceBatchId' = dr."MaintenanceBatchId" LIMIT 1)
        ) as "maintenanceTitle",
        d."Name" as "deviceName"
      FROM "DamageReport" dr
      LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
      WHERE (dr."ReporterID" = $1 OR dr."HandlerID" = $1 OR $1 = 0)
      AND dr."Status" IN ('1', '2', '3')
      ORDER BY dr."ReportDate" DESC`,
      [staffId]
    );
    return result.rows;
  }

  async create(item: Omit<WorkPlanItem, 'id'>): Promise<number> {
    await this.ensureArchiveSchema();

    const result = await pool.query(
      `INSERT INTO "WorkPlanItem" (
        "PlanDate", "StaffID", "DamageReportID", "IsNewTask", "Title", "DraftData", "IsImplemented", "CreatedBy"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING "ID"`,
      [
        item.planDate || null,
        item.staffId,
        item.damageReportId || null,
        item.isNewTask || false,
        item.title,
        item.draftData ? JSON.stringify(item.draftData) : null,
        item.isImplemented || false,
        item.createdBy || null
      ]
    );
    return result.rows[0].ID;
  }

  async delete(id: number, staffId: number, isAdmin: boolean = false): Promise<boolean> {
    const query = isAdmin
      ? { text: 'DELETE FROM "WorkPlanItem" WHERE "ID" = $1', values: [id] }
      : {
          text: `DELETE FROM "WorkPlanItem" WHERE "ID" = $1 AND (
                  "StaffID" = $2 OR
                  "DamageReportID" IN (SELECT "ID" FROM "DamageReport" WHERE "HandlerID" = $2)
                )`,
          values: [id, staffId]
        };

    const result = await pool.query(query.text, query.values);
    return (result.rowCount ?? 0) > 0;
  }

  async updateDate(id: number, planDate: string | null, staffId: number, isAdmin: boolean = false): Promise<boolean> {
    const query = isAdmin
      ? { text: 'UPDATE "WorkPlanItem" SET "PlanDate" = $1 WHERE "ID" = $2', values: [planDate, id] }
      : {
          text: `UPDATE "WorkPlanItem" SET "PlanDate" = $1 WHERE "ID" = $2 AND (
                  "StaffID" = $3 OR
                  "DamageReportID" IN (SELECT "ID" FROM "DamageReport" WHERE "HandlerID" = $3)
                )`,
          values: [planDate, id, staffId]
        };

    const result = await pool.query(query.text, query.values);
    return (result.rowCount ?? 0) > 0;
  }

  async update(id: number, staffId: number, title: string, draftData: any, reqStaffId: number, isAdmin: boolean = false): Promise<boolean> {
    const query = isAdmin
      ? { 
          text: 'UPDATE "WorkPlanItem" SET "StaffID" = $1, "Title" = $2, "DraftData" = $3 WHERE "ID" = $4 AND "IsImplemented" = false', 
          values: [staffId, title, draftData ? JSON.stringify(draftData) : null, id] 
        }
      : {
          text: `UPDATE "WorkPlanItem" SET "StaffID" = $1, "Title" = $2, "DraftData" = $3 WHERE "ID" = $4 AND "IsImplemented" = false AND (
                  "StaffID" = $5 OR
                  "DamageReportID" IN (SELECT "ID" FROM "DamageReport" WHERE "HandlerID" = $5)
                )`,
          values: [staffId, title, draftData ? JSON.stringify(draftData) : null, id, reqStaffId]
        };

    const result = await pool.query(query.text, query.values);
    return (result.rowCount ?? 0) > 0;
  }

  private async createDamageReportFromPlan(client: PoolClient, item: any, userId: string): Promise<number> {
    const draft: WorkPlanDraftData = item.DraftData;
    if (!draft?.damageContent || draft.damageContent.trim() === '') {
      throw new Error('Vui lòng nhập nội dung công việc');
    }

    const staffRes = await client.query('SELECT "DepartmentID" FROM "Staff" WHERE "ID" = $1', [item.StaffID]);
    const reportingDeptId = draft.reportingDepartmentId || staffRes.rows[0]?.DepartmentID || 1;
    const reportDate = item.PlanDate || getVNNow();

    const result = await client.query(
      `INSERT INTO "DamageReport" (
        "DeviceID", "DamageLocation", "ReporterID", "ReportingDepartmentID",
        "HandlerID", "AssignedDate", "ReportDate", "DamageContent", "Images",
        "Status", "Priority", "CreatedBy", "UpdatedBy"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING "ID"`,
      [
        draft.deviceId || null,
        draft.damageLocation || item.Title || null,
        draft.reporterId || item.StaffID,
        reportingDeptId,
        item.StaffID,
        reportDate,
        reportDate,
        draft.damageContent,
        draft.images ? JSON.stringify(draft.images) : null,
        DamageReportStatus.Pending.toString(),
        (draft.priority || DamageReportPriority.Normal).toString(),
        userId,
        userId,
      ]
    );

    return result.rows[0].ID;
  }

  private async implementWithClient(client: PoolClient, id: number, staffId: number | null, userId: string): Promise<number | null> {
    const result = await client.query(
      `SELECT wpi.*
       FROM "WorkPlanItem" wpi
       LEFT JOIN "DamageReport" dr ON wpi."DamageReportID" = dr."ID"
       WHERE wpi."ID" = $1
       ${staffId ? 'AND COALESCE(dr."HandlerID", wpi."StaffID") = $2' : ''}
       FOR UPDATE OF wpi`,
      staffId ? [id, staffId] : [id]
    );

    if (result.rows.length === 0) return null;
    const item = result.rows[0];
    if (item.IsImplemented) return item.DamageReportID;

    let damageReportId = item.DamageReportID;

    if (item.IsNewTask && !damageReportId) {
      damageReportId = await this.createDamageReportFromPlan(client, item, userId);
    } else if (damageReportId) {
      await client.query(
        `UPDATE "DamageReport"
         SET "HandlerID" = COALESCE("HandlerID", $1),
             "AssignedDate" = COALESCE("AssignedDate", $2),
             "Status" = CASE WHEN "Status" = $3 THEN $4 ELSE "Status" END,
             "UpdatedBy" = $5,
             "UpdatedAt" = CURRENT_TIMESTAMP
         WHERE "ID" = $6`,
        [
          item.StaffID,
          item.PlanDate || getVNNow(),
          DamageReportStatus.Pending.toString(),
          DamageReportStatus.Pending.toString(),
          userId,
          damageReportId
        ]
      );
    }

    await client.query(
      'UPDATE "WorkPlanItem" SET "IsImplemented" = TRUE, "DamageReportID" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $2',
      [damageReportId, id]
    );

    return damageReportId;
  }

  async implement(id: number, staffId: number, userId: string): Promise<number | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const damageReportId = await this.implementWithClient(client, id, staffId, userId);
      await client.query('COMMIT');
      return damageReportId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async implementDuePlans(dueDate: string, userId: string = 'system', staffId: number = 0): Promise<number> {
    const dueResult = await pool.query(
      `SELECT wpi."ID"
       FROM "WorkPlanItem" wpi
       LEFT JOIN "DamageReport" dr ON wpi."DamageReportID" = dr."ID"
       WHERE wpi."PlanDate" IS NOT NULL
         AND wpi."PlanDate" <= $1
         AND wpi."IsImplemented" = false
         AND (COALESCE(dr."HandlerID", wpi."StaffID") = $2 OR $2 = 0)
       ORDER BY wpi."PlanDate" ASC, wpi."ID" ASC`,
      [dueDate, staffId]
    );

    let implementedCount = 0;
    for (const row of dueResult.rows) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const reportId = await this.implementWithClient(client, row.ID, null, userId);
        await client.query('COMMIT');
        if (reportId) implementedCount += 1;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    return implementedCount;
  }
}
