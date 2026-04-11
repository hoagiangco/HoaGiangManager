import pool from './lib/db/index';

async function checkConstraints() {
  const res = await pool.query(`
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = '"DamageReport"'::regclass;
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

checkConstraints();
