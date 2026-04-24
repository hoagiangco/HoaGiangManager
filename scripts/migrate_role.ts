import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL
});

async function run() {
  try {
    const res = await pool.query(`
      INSERT INTO "AspNetRoles" ("Id", "Name", "NormalizedName", "ConcurrencyStamp")
      VALUES (gen_random_uuid()::text, 'Supervisor', 'SUPERVISOR', gen_random_uuid()::text)
      ON CONFLICT ("NormalizedName") DO NOTHING
      RETURNING *;
    `);
    console.log('Role Supervisor inserted or already exists.', res.rows);
  } catch (err) {
    console.error('Error inserting role:', err);
  } finally {
    pool.end();
  }
}

run();
