import pool from './lib/db';

async function main() {
  const res = await pool.query('SELECT "DeviceID" FROM "Event" LIMIT 1');
  console.log(res.rows[0]);
  process.exit(0);
}

main().catch(console.error);
