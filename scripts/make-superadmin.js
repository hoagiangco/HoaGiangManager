const { Pool } = require('pg');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
dotenv.config({ path: '.env.local' });

async function makeSuperAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    
    // Check if SuperAdmin role exists
    const roleCheck = await client.query(`SELECT "Id" FROM "AspNetRoles" WHERE "Name" = 'SuperAdmin'`);
    let superAdminRoleId;

    if (roleCheck.rows.length === 0) {
      superAdminRoleId = uuidv4();
      await client.query(
        `INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName") VALUES ($1, $2, $3)`,
        [superAdminRoleId, 'SuperAdmin', 'SUPERADMIN']
      );
      console.log('Created SuperAdmin role:', superAdminRoleId);
    } else {
      superAdminRoleId = roleCheck.rows[0].Id;
      console.log('SuperAdmin role already exists:', superAdminRoleId);
    }

    // Update the email and username
    const updateTarget = await client.query(
      `UPDATE "AspNetUsers" SET "Email" = 'hoagiangkg@gmail.com', "NormalizedEmail" = 'HOAGIANGKG@GMAIL.COM', "UserName" = 'hoagiangkg@gmail.com', "NormalizedUserName" = 'HOAGIANGKG@GMAIL.COM' WHERE "Email" = 'admin@quanlyvt.com' RETURNING "Id"`
    );

    let targetUserId;
    if (updateTarget.rows.length > 0) {
      targetUserId = updateTarget.rows[0].Id;
      console.log('Updated user admin@quanlyvt.com to hoagiangkg@gmail.com. User ID:', targetUserId);
    } else {
      // It might already be updated, check for it
      const existingUser = await client.query(`SELECT "Id" FROM "AspNetUsers" WHERE "Email" = 'hoagiangkg@gmail.com'`);
      if (existingUser.rows.length > 0) {
        targetUserId = existingUser.rows[0].Id;
        console.log('User hoagiangkg@gmail.com already exists. User ID:', targetUserId);
      } else {
        throw new Error("Could not find admin@quanlyvt.com or hoagiangkg@gmail.com in the database.");
      }
    }

    // Assign SuperAdmin role to this user
    const checkUserRole = await client.query(
      `SELECT * FROM "AspNetUserRoles" WHERE "UserId" = $1 AND "RoleId" = $2`,
      [targetUserId, superAdminRoleId]
    );

    if (checkUserRole.rows.length === 0) {
      await client.query(
        `INSERT INTO "AspNetUserRoles" ("UserId", "RoleId") VALUES ($1, $2)`,
        [targetUserId, superAdminRoleId]
      );
      console.log('Assigned SuperAdmin role to hoagiangkg@gmail.com');
    } else {
      console.log('hoagiangkg@gmail.com already has SuperAdmin role');
    }

    client.release();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

makeSuperAdmin();
