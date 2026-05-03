import pool from './lib/db/index';

async function main() {
  const res = await pool.query('SELECT * FROM "Event" WHERE "RelatedReportID" = 266');
  console.log(res.rows);
  process.exit(0);
}

main().catch(console.error);
