import pool from '../db';
import { WorkPlanItem, WorkPlanItemVM, DamageReportStatus, DamageReportPriority, WorkPlanDraftData } from '@/types';
import { getVNNow } from '../utils/dateFormat';
import { DamageReportService } from './damageReportService';

export class WorkPlanService {
  private damageReportService = new DamageReportService();

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
      deviceName: row.deviceName,
      location: row.location,
      deptName: row.deptName,
      damageContent: row.damageContent,
    };
  }

  async list(date: string, staffId: number): Promise<WorkPlanItemVM[]> {
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
        wpi."UpdatedAt" as "updatedAt",
        s."Name" as "staffName",
        dr."Status" as "reportStatus",
        dr."DamageLocation" as "location",
        dr."DamageContent" as "damageContent",
        dep."Name" as "deptName",
        d."Name" as "deviceName"
      FROM "WorkPlanItem" wpi
      LEFT JOIN "Staff" s ON wpi."StaffID" = s."ID"
      LEFT JOIN "DamageReport" dr ON wpi."DamageReportID" = dr."ID"
      LEFT JOIN "Device" d ON dr."DeviceID" = d."ID"
      LEFT JOIN "Department" dep ON dr."ReportingDepartmentID" = dep."ID"
      WHERE wpi."PlanDate" = $1 AND (wpi."StaffID" = $2 OR $2 = 0)
      ORDER BY wpi."ID" ASC`,
      [date, staffId]
    );

    const statusLabels: Record<number, string> = {
      [DamageReportStatus.Pending]: 'Chờ xử lý',
      [DamageReportStatus.Assigned]: 'Đã phân công',
      [DamageReportStatus.InProgress]: 'Đang xử lý',
      [DamageReportStatus.Completed]: 'Hoàn thành',
      [DamageReportStatus.Cancelled]: 'Đã hủy',
      [DamageReportStatus.Rejected]: 'Từ chối',
    };

    return result.rows.map(row => {
      const vm = this.mapRowToVM(row);
      if (vm.reportStatus) {
        vm.reportStatusName = statusLabels[vm.reportStatus] || 'Không xác định';
      }
      return vm;
    });
  }

  async getPendingReports(staffId: number): Promise<any[]> {
    // Get reports where staff is reporter OR handler and not completed/cancelled/rejected
    // If staffId is 0, get ALL pending reports
    const result = await pool.query(
      `SELECT 
        dr."ID" as id,
        dr."DamageContent" as content,
        dr."DamageLocation" as location,
        dr."ReportDate" as "reportDate",
        dr."Status" as status,
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
    const result = await pool.query(
      `INSERT INTO "WorkPlanItem" (
        "PlanDate", "StaffID", "DamageReportID", "IsNewTask", "Title", "DraftData", "IsImplemented", "CreatedBy"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING "ID"`,
      [
        item.planDate,
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
      : { text: 'DELETE FROM "WorkPlanItem" WHERE "ID" = $1 AND "StaffID" = $2', values: [id, staffId] };
    
    const result = await pool.query(query.text, query.values);
    return (result.rowCount ?? 0) > 0;
  }

  async implement(id: number, staffId: number, userId: string): Promise<number | null> {
    const result = await pool.query(
      'SELECT * FROM "WorkPlanItem" WHERE "ID" = $1 AND "StaffID" = $2',
      [id, staffId]
    );

    if (result.rows.length === 0) return null;
    const item = result.rows[0];

    if (item.IsImplemented) return item.DamageReportID;

    let damageReportId = item.DamageReportID;

    if (item.IsNewTask && !damageReportId) {
      // Create new damage report from draft data
      const draft: WorkPlanDraftData = item.DraftData;
      const combinedContent = draft.damageContent;
      
      // Get staff details for reporter
      const staffRes = await pool.query('SELECT "DepartmentID" FROM "Staff" WHERE "ID" = $1', [staffId]);
      const reportingDeptId = staffRes.rows[0]?.DepartmentID || 1;

      damageReportId = await this.damageReportService.create({
        deviceId: draft.deviceId || undefined,
        damageLocation: draft.damageLocation || item.Title || null,
        reporterId: staffId,
        reportingDepartmentId: reportingDeptId,
        damageContent: combinedContent,
        priority: draft.priority || DamageReportPriority.Normal,
        status: DamageReportStatus.Pending,
        reportDate: getVNNow(),
        images: draft.images || [],
        createdBy: userId,
        updatedBy: userId
      });
    }

    // Update work plan item
    await pool.query(
      'UPDATE "WorkPlanItem" SET "IsImplemented" = TRUE, "DamageReportID" = $1, "UpdatedAt" = CURRENT_TIMESTAMP WHERE "ID" = $2',
      [damageReportId, id]
    );

    return damageReportId;
  }
}
