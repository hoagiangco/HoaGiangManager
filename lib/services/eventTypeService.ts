import pool from '../db';
import { EventType } from '@/types';

export class EventTypeService {
  async getAll(): Promise<EventType[]> {
    const result = await pool.query(
      `SELECT "ID" as id, "Name" as name FROM "EventType" ORDER BY "Name"`
    );

    return result.rows;
  }

  async getById(id: number): Promise<EventType | null> {
    const result = await pool.query(
      `SELECT "ID" as id, "Name" as name FROM "EventType" WHERE "ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async create(eventType: Omit<EventType, 'id'>): Promise<number> {
    // Get next ID
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX("ID"), 0) + 1 as next_id FROM "EventType"'
    );
    const nextId = maxResult.rows[0].next_id;

    await pool.query(
      `INSERT INTO "EventType" ("ID", "Name") VALUES ($1, $2)`,
      [nextId, eventType.name]
    );

    return nextId;
  }

  async update(eventType: EventType): Promise<number> {
    await pool.query(
      `UPDATE "EventType" SET "Name" = $1 WHERE "ID" = $2`,
      [eventType.name, eventType.id]
    );

    return eventType.id;
  }

  async delete(id: number): Promise<boolean> {
    // Check if event type is used in Event
    const eventCheck = await pool.query(
      'SELECT "ID" FROM "Event" WHERE "EventTypeID" = $1 LIMIT 1',
      [id]
    );

    if (eventCheck.rows.length > 0) {
      return false; // Cannot delete if used
    }

    await pool.query('DELETE FROM "EventType" WHERE "ID" = $1', [id]);
    return true;
  }
}

