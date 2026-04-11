import pool from '../db';

export interface Location {
  id: number;
  name: string;
}

export class LocationService {
  async getAll(): Promise<Location[]> {
    const result = await pool.query(`SELECT "ID" as id, "Name" as name FROM "Location" ORDER BY "Name"`);
    return result.rows;
  }

  async getById(id: number): Promise<Location | null> {
    const result = await pool.query(`SELECT "ID" as id, "Name" as name FROM "Location" WHERE "ID" = $1`, [id]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async create(name: string): Promise<Location> {
    const result = await pool.query(
      `INSERT INTO "Location" ("Name") VALUES ($1) RETURNING "ID" as id, "Name" as name`,
      [name.trim()]
    );
    return result.rows[0];
  }

  async update(id: number, name: string): Promise<Location | null> {
    const result = await pool.query(
      `UPDATE "Location" SET "Name" = $1 WHERE "ID" = $2 RETURNING "ID" as id, "Name" as name`,
      [name.trim(), id]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async delete(id: number): Promise<{ success: boolean; message?: string }> {
    // Check if any device is using this location
    const deviceCheck = await pool.query(
      `SELECT "ID" FROM "Device" WHERE "LocationID" = $1 LIMIT 1`,
      [id]
    );
    if (deviceCheck.rows.length > 0) {
      return { success: false, message: 'Không thể xóa vị trí đang được sử dụng bởi thiết bị' };
    }
    await pool.query(`DELETE FROM "Location" WHERE "ID" = $1`, [id]);
    return { success: true };
  }
}

export const locationService = new LocationService();
