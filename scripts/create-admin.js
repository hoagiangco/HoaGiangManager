const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function createAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const email = 'admin@admin.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    console.log(`Creating admin user: ${email}...`);
    
    // 1. Create User
    await pool.query(`
      INSERT INTO "AspNetUsers" ("Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail", "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp", "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnabled", "AccessFailedCount", "FullName", "CreatedDate")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT ("Email") DO NOTHING
    `, [
      userId, email, email.toUpperCase(), email, email.toUpperCase(), true, hashedPassword, 
      uuidv4(), uuidv4(), true, false, true, 0, 'System Administrator', new Date()
    ]);

    // 2. Ensure Admin role exists
    const roleId = uuidv4();
    await pool.query(`
      INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ("Name") DO NOTHING
    `, [roleId, 'Admin', 'ADMIN', uuidv4()]);

    // 3. Assign Role
    const roleResult = await pool.query('SELECT "Id" FROM "AspNetRoles" WHERE "Name" = \'Admin\'');
    const finalRoleId = roleResult.rows[0].Id;
    
    const userResult = await pool.query('SELECT "Id" FROM "AspNetUsers" WHERE "Email" = $1', [email]);
    const finalUserId = userResult.rows[0].Id;

    await pool.query(`
      INSERT INTO "AspNetUserRoles" ("UserId", "RoleId")
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [finalUserId, finalRoleId]);

    console.log('✅ Admin user created successfully!');
    console.log('User:', email);
    console.log('Pass:', password);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
