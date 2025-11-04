import pool from '../db';
import { DeviceCategory } from '@/types';

export class DeviceCategoryService {
  async getAll(): Promise<DeviceCategory[]> {
    const result = await pool.query(
      `SELECT "ID" as id, "Name" as name, "DisplayOrder" as "displayOrder"
       FROM "DeviceCategory" 
       ORDER BY COALESCE("DisplayOrder", 999), "Name"`
    );

    return result.rows;
  }

  async getById(id: number): Promise<DeviceCategory | null> {
    const result = await pool.query(
      `SELECT "ID" as id, "Name" as name, "DisplayOrder" as "displayOrder"
       FROM "DeviceCategory" WHERE "ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async create(category: Omit<DeviceCategory, 'id'>): Promise<number> {
    // Get next ID
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX("ID"), 0) + 1 as next_id FROM "DeviceCategory"'
    );
    const nextId = maxResult.rows[0].next_id;

    await pool.query(
      `INSERT INTO "DeviceCategory" ("ID", "Name", "DisplayOrder") 
       VALUES ($1, $2, $3)`,
      [nextId, category.name, category.displayOrder || null]
    );

    return nextId;
  }

  async update(category: DeviceCategory): Promise<number> {
    await pool.query(
      `UPDATE "DeviceCategory" SET "Name" = $1, "DisplayOrder" = $2 WHERE "ID" = $3`,
      [category.name, category.displayOrder || null, category.id]
    );

    return category.id;
  }

  async delete(id: number): Promise<boolean> {
    // Check if category is used in Device
    const deviceCheck = await pool.query(
      'SELECT "ID" FROM "Device" WHERE "DeviceCategoryID" = $1 LIMIT 1',
      [id]
    );

    if (deviceCheck.rows.length > 0) {
      return false; // Cannot delete if used
    }

    await pool.query('DELETE FROM "DeviceCategory" WHERE "ID" = $1', [id]);
    return true;
  }
}

