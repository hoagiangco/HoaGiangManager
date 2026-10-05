const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function createAdmin() {
  const dbUrl = process.env.DATABASE_URL;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!dbUrl || !email || !password) {
    throw new Error('DATABASE_URL, ADMIN_EMAIL, and ADMIN_PASSWORD are required');
  }
  if (
    password.length < 10 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error('ADMIN_PASSWORD must contain at least 10 characters, upper/lower case, a digit, and a symbol');
  }

  const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  const sslMode = (process.env.DATABASE_SSL_MODE || (isLocalhost ? 'disable' : 'verify-full'))
    .trim()
    .toLowerCase();
  let ssl = false;
  if (sslMode === 'require') {
    ssl = { rejectUnauthorized: false };
  } else if (sslMode === 'verify-full') {
    const ca = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n').trim();
    ssl = ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
  } else if (sslMode !== 'disable') {
    throw new Error(`Unsupported DATABASE_SSL_MODE "${process.env.DATABASE_SSL_MODE}"`);
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl
  });

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    console.log(`Creating admin user: ${email}...`);
    
    // 1. Create User
    await pool.query(`
      INSERT INTO "AspNetUsers" ("Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail", "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp", "PhoneNumberConfirmed", "TwoFactorEnabled", "LockoutEnabled", "AccessFailedCount", "FullName", "CreatedDate", "MustChangePassword")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT ("Email") DO NOTHING
    `, [
      userId, email, email.toUpperCase(), email, email.toUpperCase(), true, hashedPassword, 
      uuidv4(), uuidv4(), true, false, true, 0, 'System Administrator', new Date(), true
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
    console.log('A temporary password was supplied through ADMIN_PASSWORD and must be changed at first login.');

  } catch (err) {
    process.exitCode = 1;
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

createAdmin();
