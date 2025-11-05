import pool from '../db';
import { User } from '@/types';
import bcrypt from 'bcryptjs';

export interface UserVM extends User {
  roles: string[];
}

export class UserService {
  async getAll(): Promise<UserVM[]> {
    const result = await pool.query(
      `SELECT 
        u."Id" as id,
        u."UserName" as "userName",
        u."Email" as email,
        u."FullName" as "fullName",
        u."CreatedDate" as "createdDate",
        ARRAY_AGG(r."Name") as roles
      FROM "AspNetUsers" u
      LEFT JOIN "AspNetUserRoles" ur ON u."Id" = ur."UserId"
      LEFT JOIN "AspNetRoles" r ON ur."RoleId" = r."Id"
      GROUP BY u."Id", u."UserName", u."Email", u."FullName", u."CreatedDate"
      ORDER BY u."CreatedDate" DESC`
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      userName: row.userName,
      email: row.email,
      fullName: row.fullName,
      createdDate: row.createdDate,
      roles: row.roles.filter((r: string) => r !== null) || [],
    }));
  }

  async getById(id: string): Promise<UserVM | null> {
    const result = await pool.query(
      `SELECT 
        u."Id" as id,
        u."UserName" as "userName",
        u."Email" as email,
        u."FullName" as "fullName",
        u."CreatedDate" as "createdDate",
        ARRAY_AGG(r."Name") as roles
      FROM "AspNetUsers" u
      LEFT JOIN "AspNetUserRoles" ur ON u."Id" = ur."UserId"
      LEFT JOIN "AspNetRoles" r ON ur."RoleId" = r."Id"
      WHERE u."Id" = $1
      GROUP BY u."Id", u."UserName", u."Email", u."FullName", u."CreatedDate"`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userName: row.userName,
      email: row.email,
      fullName: row.fullName,
      createdDate: row.createdDate,
      roles: row.roles.filter((r: string) => r !== null) || [],
    };
  }

  async create(userData: {
    email: string;
    password: string;
    fullName?: string;
    roles?: string[];
  }): Promise<string> {
    const { v4: uuidv4 } = require('uuid');
    const userId = uuidv4();
    const normalizedEmail = userData.email.toUpperCase();
    const normalizedUserName = userData.email.toUpperCase();
    const passwordHash = await bcrypt.hash(userData.password, 10);

    await pool.query(
      `INSERT INTO "AspNetUsers" (
        "Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail",
        "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp",
        "FullName", "CreatedDate"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        userData.email,
        normalizedUserName,
        userData.email,
        normalizedEmail,
        false,
        passwordHash,
        uuidv4(),
        uuidv4(),
        userData.fullName || null,
        new Date()
      ]
    );

    // Assign roles
    if (userData.roles && userData.roles.length > 0) {
      for (const roleName of userData.roles) {
        const roleResult = await pool.query(
          'SELECT "Id" FROM "AspNetRoles" WHERE "Name" = $1',
          [roleName]
        );
        if (roleResult.rows.length > 0) {
          await pool.query(
            'INSERT INTO "AspNetUserRoles" ("UserId", "RoleId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [userId, roleResult.rows[0].Id]
          );
        }
      }
    } else {
      // Default to User role
      const userRoleResult = await pool.query(
        'SELECT "Id" FROM "AspNetRoles" WHERE "Name" = $1',
        ['User']
      );
      if (userRoleResult.rows.length > 0) {
        await pool.query(
          'INSERT INTO "AspNetUserRoles" ("UserId", "RoleId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, userRoleResult.rows[0].Id]
        );
      }
    }

    return userId;
  }

  async update(userData: {
    id: string;
    email?: string;
    fullName?: string;
    password?: string;
    roles?: string[];
  }): Promise<void> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (userData.email) {
      updates.push(`"Email" = $${paramIndex}`);
      updates.push(`"NormalizedEmail" = $${paramIndex + 1}`);
      updates.push(`"UserName" = $${paramIndex}`);
      updates.push(`"NormalizedUserName" = $${paramIndex + 1}`);
      params.push(userData.email, userData.email.toUpperCase());
      paramIndex += 2;
    }

    if (userData.fullName !== undefined) {
      updates.push(`"FullName" = $${paramIndex}`);
      params.push(userData.fullName);
      paramIndex++;
    }

    if (userData.password) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      updates.push(`"PasswordHash" = $${paramIndex}`);
      params.push(passwordHash);
      paramIndex++;
    }

    if (updates.length > 0) {
      params.push(userData.id);
      await pool.query(
        `UPDATE "AspNetUsers" SET ${updates.join(', ')} WHERE "Id" = $${paramIndex}`,
        params
      );
    }

    // Update roles
    if (userData.roles !== undefined) {
      // Remove all existing roles
      await pool.query(
        'DELETE FROM "AspNetUserRoles" WHERE "UserId" = $1',
        [userData.id]
      );

      // Add new roles
      if (userData.roles.length > 0) {
        for (const roleName of userData.roles) {
          const roleResult = await pool.query(
            'SELECT "Id" FROM "AspNetRoles" WHERE "Name" = $1',
            [roleName]
          );
          if (roleResult.rows.length > 0) {
            await pool.query(
              'INSERT INTO "AspNetUserRoles" ("UserId", "RoleId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [userData.id, roleResult.rows[0].Id]
            );
          }
        }
      }
    }
  }

  async delete(id: string): Promise<boolean> {
    // Check if trying to delete the last admin
    const userResult = await pool.query(
      `SELECT u."Id"
       FROM "AspNetUsers" u
       INNER JOIN "AspNetUserRoles" ur ON u."Id" = ur."UserId"
       INNER JOIN "AspNetRoles" r ON ur."RoleId" = r."Id"
       WHERE r."Name" = 'Admin' AND u."Id" != $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      throw new Error('Không thể xóa user cuối cùng có quyền Admin');
    }

    // Delete user (cascade will handle user roles)
    await pool.query('DELETE FROM "AspNetUsers" WHERE "Id" = $1', [id]);
    return true;
  }

  async getAllRoles(): Promise<{ id: string; name: string }[]> {
    const result = await pool.query(
      'SELECT "Id" as id, "Name" as name FROM "AspNetRoles" ORDER BY "Name"'
    );
    return result.rows;
  }
}




