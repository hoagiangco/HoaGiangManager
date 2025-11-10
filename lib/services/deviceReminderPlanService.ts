import pool from '../db';
import { DeviceReminderPlan } from '@/types';

const parsePlanRow = (row: any): DeviceReminderPlan => ({
  id: row.id,
  deviceId: row.deviceId,
  reminderType: row.reminderType,
  eventTypeId: row.eventTypeId,
  title: row.title,
  description: row.description,
  intervalValue: row.intervalValue,
  intervalUnit: row.intervalUnit,
  cronExpression: row.cronExpression,
  startFrom: row.startFrom,
  endAt: row.endAt,
  nextDueDate: row.nextDueDate,
  lastTriggeredAt: row.lastTriggeredAt,
  isActive: row.isActive ?? true,
  metadata:
    typeof row.metadata === 'string'
      ? (() => {
          try {
            return JSON.parse(row.metadata);
          } catch (error) {
            return null;
          }
        })()
      : row.metadata || null,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
  updatedBy: row.updatedBy,
  updatedAt: row.updatedAt,
});

export class DeviceReminderPlanService {
  async list(deviceId?: number): Promise<DeviceReminderPlan[]> {
    const params: any[] = [];
    let whereClause = '';

    if (deviceId && deviceId > 0) {
      params.push(deviceId);
      whereClause = 'WHERE p."DeviceID" = $1';
    }

    const result = await pool.query(
      `
      SELECT
        p."ID" as id,
        p."DeviceID" as "deviceId",
        p."ReminderType" as "reminderType",
        p."EventTypeID" as "eventTypeId",
        et."Name" as "eventTypeName",
        p."Title" as title,
        p."Description" as description,
        p."IntervalValue" as "intervalValue",
        p."IntervalUnit" as "intervalUnit",
        p."CronExpression" as "cronExpression",
        p."StartFrom" as "startFrom",
        p."EndAt" as "endAt",
        p."NextDueDate" as "nextDueDate",
        p."LastTriggeredAt" as "lastTriggeredAt",
        p."IsActive" as "isActive",
        p."Metadata" as metadata,
        p."CreatedBy" as "createdBy",
        p."CreatedAt" as "createdAt",
        p."UpdatedBy" as "updatedBy",
        p."UpdatedAt" as "updatedAt"
      FROM "DeviceReminderPlan" p
      LEFT JOIN "EventType" et ON p."EventTypeID" = et."ID"
      ${whereClause}
      ORDER BY p."IsActive" DESC, p."NextDueDate" NULLS LAST, p."ID" DESC
      `,
      params
    );

    return result.rows.map(parsePlanRow);
  }

  async getById(id: number): Promise<DeviceReminderPlan | null> {
    const result = await pool.query(
      `
      SELECT
        "ID" as id,
        "DeviceID" as "deviceId",
        "ReminderType" as "reminderType",
        "EventTypeID" as "eventTypeId",
        "Title" as title,
        "Description" as description,
        "IntervalValue" as "intervalValue",
        "IntervalUnit" as "intervalUnit",
        "CronExpression" as "cronExpression",
        "StartFrom" as "startFrom",
        "EndAt" as "endAt",
        "NextDueDate" as "nextDueDate",
        "LastTriggeredAt" as "lastTriggeredAt",
        "IsActive" as "isActive",
        "Metadata" as metadata,
        "CreatedBy" as "createdBy",
        "CreatedAt" as "createdAt",
        "UpdatedBy" as "updatedBy",
        "UpdatedAt" as "updatedAt"
      FROM "DeviceReminderPlan"
      WHERE "ID" = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return parsePlanRow(result.rows[0]);
  }

  async create(plan: Omit<DeviceReminderPlan, 'id'>): Promise<number> {
    const result = await pool.query(
      `
      INSERT INTO "DeviceReminderPlan" (
        "DeviceID",
        "ReminderType",
        "EventTypeID",
        "Title",
        "Description",
        "IntervalValue",
        "IntervalUnit",
        "CronExpression",
        "StartFrom",
        "EndAt",
        "NextDueDate",
        "LastTriggeredAt",
        "IsActive",
        "Metadata",
        "CreatedBy",
        "CreatedAt",
        "UpdatedBy",
        "UpdatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14::jsonb, $15, $16, $17, $18
      )
      RETURNING "ID"
      `,
      [
        plan.deviceId,
        plan.reminderType,
        plan.eventTypeId || null,
        plan.title || null,
        plan.description || null,
        plan.intervalValue || null,
        plan.intervalUnit || null,
        plan.cronExpression || null,
        plan.startFrom || null,
        plan.endAt || null,
        plan.nextDueDate || null,
        plan.lastTriggeredAt || null,
        plan.isActive ?? true,
        plan.metadata ? JSON.stringify(plan.metadata) : null,
        plan.createdBy || null,
        plan.createdAt || new Date(),
        plan.updatedBy || plan.createdBy || null,
        plan.updatedAt || new Date(),
      ]
    );

    return result.rows[0].ID;
  }

  async update(plan: DeviceReminderPlan): Promise<number> {
    await pool.query(
      `
      UPDATE "DeviceReminderPlan" SET
        "DeviceID" = $1,
        "ReminderType" = $2,
        "EventTypeID" = $3,
        "Title" = $4,
        "Description" = $5,
        "IntervalValue" = $6,
        "IntervalUnit" = $7,
        "CronExpression" = $8,
        "StartFrom" = $9,
        "EndAt" = $10,
        "NextDueDate" = $11,
        "LastTriggeredAt" = $12,
        "IsActive" = $13,
        "Metadata" = $14::jsonb,
        "UpdatedBy" = $15,
        "UpdatedAt" = CURRENT_TIMESTAMP
      WHERE "ID" = $16
      `,
      [
        plan.deviceId,
        plan.reminderType,
        plan.eventTypeId || null,
        plan.title || null,
        plan.description || null,
        plan.intervalValue || null,
        plan.intervalUnit || null,
        plan.cronExpression || null,
        plan.startFrom || null,
        plan.endAt || null,
        plan.nextDueDate || null,
        plan.lastTriggeredAt || null,
        plan.isActive ?? true,
        plan.metadata ? JSON.stringify(plan.metadata) : null,
        plan.updatedBy || null,
        plan.id,
      ]
    );

    return plan.id!;
  }

  async delete(id: number): Promise<boolean> {
    await pool.query('DELETE FROM "DeviceReminderPlan" WHERE "ID" = $1', [id]);
    return true;
  }
}

