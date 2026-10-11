import pool from '../lib/db/index';
async function run() {
  const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Device'`);
  console.log(res.rows);
  const res2 = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Users' OR table_name = 'User'`);
  console.log(res2.rows);
  pool.end();
}
run();
