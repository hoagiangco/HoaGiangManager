import pool from '../db';
import { Staff, StaffVM } from '@/types';
import { UserService } from './userService';

export class StaffService {
  async getStaffByDepartment(departmentId: number = 0): Promise<StaffVM[]> {
    let query = `
      SELECT 
        s."ID" as id,
        s."Name" as name,
        s."Gender" as gender,
        s."Birthday" as birthday,
        s."DepartmentID" as "departmentId",
        s."UserId" as "userId",
        u."Email" as email,
        d."Name" as "departmentName"
      FROM "Staff" s
      LEFT JOIN "Department" d ON s."DepartmentID" = d."ID"
      LEFT JOIN "AspNetUsers" u ON s."UserId" = u."Id"
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
      `SELECT 
        s."ID" as id,
        s."Name" as name,
        s."Gender" as gender,
        s."Birthday" as birthday,
        s."DepartmentID" as "departmentId",
        s."UserId" as "userId",
        u."Email" as email
      FROM "Staff" s
      LEFT JOIN "AspNetUsers" u ON s."UserId" = u."Id"
      WHERE s."ID" = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      gender: row.gender,
      birthday: row.birthday,
      departmentId: row.departmentId,
      userId: row.userId
    };
  }

  async getByUserId(userId: string): Promise<Staff | null> {
    const result = await pool.query(
      `SELECT 
        "ID" as id,
        "Name" as name,
        "Gender" as gender,
        "Birthday" as birthday,
        "DepartmentID" as "departmentId",
        "UserId" as "userId"
      FROM "Staff" WHERE "UserId" = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      gender: row.gender,
      birthday: row.birthday,
      departmentId: row.departmentId,
      userId: row.userId
    };
  }

  async create(staff: Omit<Staff, 'id'>): Promise<number> {
    const userService = new UserService();
    let userId: string | null = null;

    // If email is provided, create user account automatically
    if (staff.email && staff.email.trim()) {
      // Check if email already exists
      const existingUserResult = await pool.query(
        'SELECT "Id" FROM "AspNetUsers" WHERE "NormalizedEmail" = $1',
        [staff.email.trim().toUpperCase()]
      );
      
      if (existingUserResult.rows.length > 0) {
        // Email already exists, link to existing user
        userId = existingUserResult.rows[0].Id;
        
        // Check if this user is already linked to another staff
        const existingStaffResult = await pool.query(
          'SELECT "ID" FROM "Staff" WHERE "UserId" = $1',
          [userId]
        );
        
        if (existingStaffResult.rows.length > 0) {
          throw new Error(`Email ${staff.email} đã được liên kết với nhân viên khác`);
        }
        
        // Inspect existing user's password hash and set default if legacy (non-bcrypt)
        const userRow = await pool.query(
          'SELECT "PasswordHash" FROM "AspNetUsers" WHERE "Id" = $1',
          [userId]
        );
        const hasHash: string | null = userRow.rows[0]?.PasswordHash || null;
        const isBcrypt = !!hasHash && /^\$2[aby]\$/.test(hasHash);
        if (!isBcrypt) {
          const defaultPassword = 'Staff@123';
          await new UserService().update({ id: userId as string, password: defaultPassword, fullName: staff.name });
        } else {
          // Update FullName to match staff name
          await pool.query(
            'UPDATE "AspNetUsers" SET "FullName" = $1 WHERE "Id" = $2',
            [staff.name, userId]
          );
        }

        // Ensure the user has at least role 'User'
        const roleRow = await pool.query('SELECT "Id" FROM "AspNetRoles" WHERE "Name" = $1', ['User']);
        if (roleRow.rows.length > 0) {
          await pool.query(
            'INSERT INTO "AspNetUserRoles" ("UserId", "RoleId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, roleRow.rows[0].Id]
          );
        }
        
        console.log(`Linked existing user account for staff: ${staff.email} (userId: ${userId})`);
      } else {
        // Create new user account
        const defaultPassword = 'Staff@123'; // Default password
        
        userId = await userService.create({
          email: staff.email.trim(),
          password: defaultPassword,
          fullName: staff.name,
          roles: ['User'] // Default role is User
        });

        console.log(`Created user account for staff: ${staff.email} (userId: ${userId})`);
      }
    }

    // Get next ID
    const maxResult = await pool.query(
      'SELECT COALESCE(MAX("ID"), 0) + 1 as next_id FROM "Staff"'
    );
    const nextId = maxResult.rows[0].next_id;

    await pool.query(
      `INSERT INTO "Staff" ("ID", "Name", "Gender", "Birthday", "DepartmentID", "UserId")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        nextId,
        staff.name,
        staff.gender || null,
        staff.birthday || null,
        staff.departmentId || null,
        userId
      ]
    );

    return nextId;
  }

  async update(staff: Staff): Promise<number> {
    const userService = new UserService();
    // Get existing staff to preserve userId
    const existingStaff = await this.getById(staff.id);
    
    let userId = existingStaff?.userId || null;

    // If staff already has a user account and email is provided, update the user's email (with uniqueness check)
    if (userId && staff.email && staff.email.trim()) {
      const newEmail = staff.email.trim();
      const normalizedEmail = newEmail.toUpperCase();

      // Ensure this email is not used by another user
      const conflict = await pool.query(
        'SELECT "Id" FROM "AspNetUsers" WHERE "NormalizedEmail" = $1 AND "Id" <> $2',
        [normalizedEmail, userId]
      );
      if (conflict.rows.length > 0) {
        throw new Error(`Email ${newEmail} đã được sử dụng bởi tài khoản khác`);
      }

      // Update the user's email and full name
      await new UserService().update({ id: userId, email: newEmail, fullName: staff.name });
    }

    // If staff doesn't have userId yet but email is provided, create user account
    if (!existingStaff?.userId && staff.email && staff.email.trim()) {
      // Check if email already exists
      const existingUserResult = await pool.query(
        'SELECT "Id" FROM "AspNetUsers" WHERE "NormalizedEmail" = $1',
        [staff.email.trim().toUpperCase()]
      );
      
      if (existingUserResult.rows.length > 0) {
        // Email already exists, link to existing user
        userId = existingUserResult.rows[0].Id;
        
        // Check if this user is already linked to another staff
        const existingStaffResult = await pool.query(
          'SELECT "ID" FROM "Staff" WHERE "UserId" = $1 AND "ID" != $2',
          [userId, staff.id]
        );
        
        if (existingStaffResult.rows.length > 0) {
          throw new Error(`Email ${staff.email} đã được liên kết với nhân viên khác`);
        }
        
        // Ensure user has a password; if not, set default
        const userRow = await pool.query(
          'SELECT "PasswordHash" FROM "AspNetUsers" WHERE "Id" = $1',
          [userId]
        );
        if (!userRow.rows[0]?.PasswordHash) {
          const defaultPassword = 'Staff@123';
          await userService.update({ id: userId as string, password: defaultPassword, fullName: staff.name });
        } else {
          // Update FullName to match staff name
          await pool.query(
            'UPDATE "AspNetUsers" SET "FullName" = $1 WHERE "Id" = $2',
            [staff.name, userId]
          );
        }
        
        // Ensure user has role 'User'
        const roleRow = await pool.query('SELECT "Id" FROM "AspNetRoles" WHERE "Name" = $1', ['User']);
        if (roleRow.rows.length > 0) {
          await pool.query(
            'INSERT INTO "AspNetUserRoles" ("UserId", "RoleId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, roleRow.rows[0].Id]
          );
        }
        
        console.log(`Linked existing user account for staff: ${staff.email} (userId: ${userId})`);
      } else {
        // Create new user account
        const defaultPassword = 'Staff@123'; // Default password
        
        userId = await userService.create({
          email: staff.email.trim(),
          password: defaultPassword,
          fullName: staff.name,
          roles: ['User'] // Default role is User
        });

        console.log(`Created user account for staff: ${staff.email} (userId: ${userId})`);
      }
    }

    // Update staff record (preserve or set userId)
    await pool.query(
      `UPDATE "Staff" 
       SET "Name" = $1, "Gender" = $2, "Birthday" = $3, "DepartmentID" = $4, "UserId" = $5
       WHERE "ID" = $6`,
      [
        staff.name,
        staff.gender || null,
        staff.birthday || null,
        staff.departmentId || null,
        userId,
        staff.id
      ]
    );

    // Always sync FullName with staff name if userId exists
    if (userId) {
      await pool.query(
        'UPDATE "AspNetUsers" SET "FullName" = $1 WHERE "Id" = $2',
        [staff.name, userId]
      );
    }

    return staff.id;
  }

  // Helper method to check and sync names between Staff and User
  async syncNamesWithUsers(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    try {
      const result = await pool.query(`
        SELECT 
          s."ID" as staffId,
          s."Name" as staffName,
          s."UserId" as userId,
          u."FullName" as userName
        FROM "Staff" s
        INNER JOIN "AspNetUsers" u ON s."UserId" = u."Id"
        WHERE s."Name" != COALESCE(u."FullName", '')
      `);

      for (const row of result.rows) {
        try {
          await pool.query(
            'UPDATE "AspNetUsers" SET "FullName" = $1 WHERE "Id" = $2',
            [row.staffName, row.userId]
          );
          synced++;
        } catch (error: any) {
          errors.push(`Staff ID ${row.staffId}: ${error.message}`);
        }
      }
    } catch (error: any) {
      errors.push(`Sync error: ${error.message}`);
    }

    return { synced, errors };
  }

  // Method to get staff with name mismatches
  async getNameMismatches(): Promise<Array<{ staffId: number; staffName: string; userId: string; userName: string | null }>> {
    const result = await pool.query(`
      SELECT 
        s."ID" as "staffId",
        s."Name" as "staffName",
        s."UserId" as "userId",
        u."FullName" as "userName"
      FROM "Staff" s
      INNER JOIN "AspNetUsers" u ON s."UserId" = u."Id"
      WHERE s."Name" != COALESCE(u."FullName", '')
      ORDER BY s."ID"
    `);

    return result.rows;
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

