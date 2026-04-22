
const pool = require('./lib/db').default;

async function checkSchema() {
  const res = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'DamageReport' 
    AND column_name IN ('HandlingDate', 'CompletedDate', 'ReportDate')
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

checkSchema().catch(err => {
  console.error(err);
  process.exit(1);
});
