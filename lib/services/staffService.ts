import pool from '../db';
import { Staff, StaffVM } from '@/types';

export class StaffService {
  async getStaffByDepartment(departmentId: number = 0): Promise<StaffVM[]> {
    let query = `
      SELECT 
        s."ID" as id,
        s."Name" as name,
        s."Gender" as gender,
        s."Birthday" as birthday,
        s."DepartmentID" as "departmentId",
        d."Name" as "departmentName"
      FROM "Staff" s
      LEFT JOIN "Department" d ON s."DepartmentID" = d."ID"
    `;

    const params: any[] = [];
    if (departmentId > 0) {
      query += ` WHERE s."DepartmentID" = $1`;
      params.push(departmentId);
    }

    query += ` ORDER BY s."Name"`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  async getById(id: number): Promise<Staff | null> {
    const result = await pool.query(
      `SELECT * FROM "Staff" WHERE "ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.ID,
      name: row.Name,
      gender: row.Gender,
      birthday: row.Birthday,
      departmentId: row.DepartmentID
    };
  }

  async create(staff: Omit<Staff, 'id'>): Promise<number> {
    // Get next ID
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX("ID"), 0) + 1 as next_id FROM "Staff"'
    );
    const nextId = maxResult.rows[0].next_id;

    await pool.query(
      `INSERT INTO "Staff" ("ID", "Name", "Gender", "Birthday", "DepartmentID")
       VALUES ($1, $2, $3, $4, $5)`,
      [
        nextId,
        staff.name,
        staff.gender || null,
        staff.birthday || null,
        staff.departmentId || null
      ]
    );

    return nextId;
  }

  async update(staff: Staff): Promise<number> {
    await pool.query(
      `UPDATE "Staff" SET
        "Name" = $1,
        "Gender" = $2,
        "Birthday" = $3,
        "DepartmentID" = $4
      WHERE "ID" = $5`,
      [
        staff.name,
        staff.gender || null,
        staff.birthday || null,
        staff.departmentId || null,
        staff.id
      ]
    );

    return staff.id;
  }

  async delete(id: number): Promise<boolean> {
    // Check if staff is used in Event
    const eventCheck = await pool.query(
      'SELECT "ID" FROM "Event" WHERE "StaffID" = $1 LIMIT 1',
      [id]
    );

    if (eventCheck.rows.length > 0) {
      return false; // Cannot delete if used
    }

    await pool.query('DELETE FROM "Staff" WHERE "ID" = $1', [id]);
    return true;
  }
}

