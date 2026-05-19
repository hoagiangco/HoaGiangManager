import pool from '../db';

export interface Location {
  id: number;
  name: string;
  parentId?: number;
  parentName?: string;
}

export class LocationService {
  async getAll(): Promise<Location[]> {
    const result = await pool.query(`
      SELECT l1."ID" as id, l1."Name" as name, l1."ParentID" as "parentId", l2."Name" as "parentName"
      FROM "Location" l1
      LEFT JOIN "Location" l2 ON l1."ParentID" = l2."ID"
      ORDER BY l1."Name"
    `);
    return result.rows;
  }

  async getById(id: number): Promise<Location | null> {
    const result = await pool.query(`
      SELECT l1."ID" as id, l1."Name" as name, l1."ParentID" as "parentId", l2."Name" as "parentName"
      FROM "Location" l1
      LEFT JOIN "Location" l2 ON l1."ParentID" = l2."ID"
      WHERE l1."ID" = $1
    `, [id]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }

  async create(name: string, parentId: number | null = null): Promise<Location> {
    const parentVal = (parentId && Number(parentId) > 0) ? Number(parentId) : null;
    const result = await pool.query(
      `INSERT INTO "Location" ("Name", "ParentID") VALUES ($1, $2) RETURNING "ID" as id, "Name" as name, "ParentID" as "parentId"`,
      [name.trim(), parentVal]
    );
    return result.rows[0];
  }

  async update(id: number, name: string, parentId: number | null = null): Promise<Location | null> {
    const parentVal = (parentId && Number(parentId) > 0) ? Number(parentId) : null;
    const result = await pool.query(
      `UPDATE "Location" SET "Name" = $1, "ParentID" = $2 WHERE "ID" = $3 RETURNING "ID" as id, "Name" as name, "ParentID" as "parentId"`,
      [name.trim(), parentVal, id]
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
