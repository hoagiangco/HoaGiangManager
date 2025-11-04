import pool from '../db';
import { Department } from '@/types';

export class DepartmentService {
  async getAll(): Promise<Department[]> {
    const result = await pool.query(
      `SELECT "ID" as id, "Name" as name FROM "Department" ORDER BY "Name"`
    );

    return result.rows;
  }

  async getById(id: number): Promise<Department | null> {
    const result = await pool.query(
      `SELECT "ID" as id, "Name" as name FROM "Department" WHERE "ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async create(department: Omit<Department, 'id'>): Promise<number> {
    // Get next ID
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX("ID"), 0) + 1 as next_id FROM "Department"'
    );
    const nextId = maxResult.rows[0].next_id;

    await pool.query(
      `INSERT INTO "Department" ("ID", "Name") VALUES ($1, $2)`,
      [nextId, department.name]
    );

    return nextId;
  }

  async update(department: Department): Promise<number> {
    await pool.query(
      `UPDATE "Department" SET "Name" = $1 WHERE "ID" = $2`,
      [department.name, department.id]
    );

    return department.id;
  }

  async delete(id: number): Promise<boolean> {
    // Check if department is used in Staff or Device
    const staffCheck = await pool.query(
      'SELECT "ID" FROM "Staff" WHERE "DepartmentID" = $1 LIMIT 1',
      [id]
    );

    const deviceCheck = await pool.query(
      'SELECT "ID" FROM "Device" WHERE "DepartmentID" = $1 LIMIT 1',
      [id]
    );

    if (staffCheck.rows.length > 0 || deviceCheck.rows.length > 0) {
      return false; // Cannot delete if used
    }

    await pool.query('DELETE FROM "Department" WHERE "ID" = $1', [id]);
    return true;
  }
}

