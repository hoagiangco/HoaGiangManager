import pool from '../lib/db/index';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { validatePassword } from '../lib/auth/password';

dotenv.config();

async function seed() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const userPassword = process.env.SEED_USER_PASSWORD;

  if (!adminPassword || !userPassword) {
    throw new Error('SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD are required');
  }

  const adminPasswordError = validatePassword(adminPassword);
  const userPasswordError = validatePassword(userPassword);
  if (adminPasswordError || userPasswordError) {
    throw new Error(`Seed passwords do not meet policy: ${adminPasswordError || userPasswordError}`);
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create roles
    const adminRoleId = uuidv4();
    const userRoleId = uuidv4();

    await client.query(`
      INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ("Id") DO NOTHING
    `, [adminRoleId, 'Admin', 'ADMIN', uuidv4()]);

    await client.query(`
      INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ("Id") DO NOTHING
    `, [userRoleId, 'User', 'USER', uuidv4()]);

    // Create admin user
    const adminId = uuidv4();
    const adminPasswordHash = await bcrypt.hash(adminPassword, 12);
    
    const adminExists = await client.query(
      'SELECT "Id" FROM "AspNetUsers" WHERE "Email" = $1',
      ['admin@quanlyvt.com']
    );

    if (adminExists.rows.length === 0) {
      await client.query(`
        INSERT INTO "AspNetUsers" (
          "Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail",
          "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp",
          "FullName", "CreatedDate", "MustChangePassword"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        adminId,
        'admin@quanlyvt.com',
        'ADMIN@QUANLYVT.COM',
        'admin@quanlyvt.com',
        'ADMIN@QUANLYVT.COM',
        true,
        adminPasswordHash,
        uuidv4(),
        uuidv4(),
        'Quản trị viên',
        new Date(),
        true
      ]);

      // Assign admin role
      await client.query(`
        INSERT INTO "AspNetUserRoles" ("UserId", "RoleId")
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [adminId, adminRoleId]);
    }

    // Create user
    const userId = uuidv4();
    const userPasswordHash = await bcrypt.hash(userPassword, 12);
    
    const userExists = await client.query(
      'SELECT "Id" FROM "AspNetUsers" WHERE "Email" = $1',
      ['user@quanlyvt.com']
    );

    if (userExists.rows.length === 0) {
      await client.query(`
        INSERT INTO "AspNetUsers" (
          "Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail",
          "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp",
          "FullName", "CreatedDate", "MustChangePassword"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        userId,
        'user@quanlyvt.com',
        'USER@QUANLYVT.COM',
        'user@quanlyvt.com',
        'USER@QUANLYVT.COM',
        true,
        userPasswordHash,
        uuidv4(),
        uuidv4(),
        'Người dùng thường',
        new Date(),
        true
      ]);

      // Assign user role
      await client.query(`
        INSERT INTO "AspNetUserRoles" ("UserId", "RoleId")
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [userId, userRoleId]);
    }

    await client.query('COMMIT');
    console.log('✅ Database seed completed successfully!');
    console.log('📝 Default accounts created:');
    console.log('   Admin: admin@quanlyvt.com (temporary password supplied via environment)');
    console.log('   User:  user@quanlyvt.com (temporary password supplied via environment)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .then(() => {
    console.log('Seed process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  });

