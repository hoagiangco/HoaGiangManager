import pool from '../db';
import { EventStatus, EventType } from '@/types';

export class EventTypeService {
  async getAll(): Promise<EventType[]> {
    const result = await pool.query(
      `SELECT
        "ID" as id,
        "Name" as name,
        "Code" as code,
        "Description" as description,
        "Category" as category,
        "Color" as color,
        "IsReminder" as "isReminder",
        "DefaultStatus" as "defaultStatus",
        "DefaultLeadTimeDays" as "defaultLeadTimeDays"
      FROM "EventType"
      ORDER BY "Name"`
    );

    return result.rows.map((row: any) => ({
      ...row,
      defaultStatus: row.defaultStatus || EventStatus.Planned,
    }));
  }

  async getById(id: number): Promise<EventType | null> {
    const result = await pool.query(
      `SELECT
        "ID" as id,
        "Name" as name,
        "Code" as code,
        "Description" as description,
        "Category" as category,
        "Color" as color,
        "IsReminder" as "isReminder",
        "DefaultStatus" as "defaultStatus",
        "DefaultLeadTimeDays" as "defaultLeadTimeDays"
      FROM "EventType"
      WHERE "ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      defaultStatus: row.defaultStatus || EventStatus.Planned,
    };
  }

  async create(eventType: Omit<EventType, 'id'>): Promise<number> {
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX("ID"), 0) + 1 as next_id FROM "EventType"'
    );
    const nextId = maxResult.rows[0].next_id;

    await pool.query(
      `INSERT INTO "EventType" (
        "ID", "Name", "Code", "Description", "Category",
        "Color", "IsReminder", "DefaultStatus", "DefaultLeadTimeDays"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        nextId,
        eventType.name,
        eventType.code || null,
        eventType.description || null,
        eventType.category || null,
        eventType.color || null,
        eventType.isReminder ?? false,
        eventType.defaultStatus || EventStatus.Planned,
        eventType.defaultLeadTimeDays || null,
      ]
    );

    return nextId;
  }

  async update(eventType: EventType): Promise<number> {
    await pool.query(
      `UPDATE "EventType" SET
        "Name" = $1,
        "Code" = $2,
        "Description" = $3,
        "Category" = $4,
        "Color" = $5,
        "IsReminder" = $6,
        "DefaultStatus" = $7,
        "DefaultLeadTimeDays" = $8
      WHERE "ID" = $9`,
      [
        eventType.name,
        eventType.code || null,
        eventType.description || null,
        eventType.category || null,
        eventType.color || null,
        eventType.isReminder ?? false,
        eventType.defaultStatus || EventStatus.Planned,
        eventType.defaultLeadTimeDays || null,
        eventType.id,
      ]
    );

    return eventType.id;
  }

  async delete(id: number): Promise<boolean> {
    const eventCheck = await pool.query(
      'SELECT "ID" FROM "Event" WHERE "EventTypeID" = $1 LIMIT 1',
      [id]
    );

    if (eventCheck.rows.length > 0) {
      return false;
    }

    await pool.query('DELETE FROM "EventType" WHERE "ID" = $1', [id]);
    return true;
  }
}

