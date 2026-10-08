import pool from './lib/db/index';

async function main() {
  await pool.query(`ALTER TABLE "Staff" ADD COLUMN "IsResigned" BOOLEAN DEFAULT false;`);
  console.log("Column IsResigned added successfully.");
  process.exit(0);
}

main().catch(console.error);
