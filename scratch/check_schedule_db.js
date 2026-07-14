const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const result = await pool.query(`
    SELECT "ID", "NextDueDate", "IntervalValue", "IntervalUnit", "Metadata" 
    FROM "DeviceReminderPlan" 
    WHERE "Metadata"::text LIKE '%specific_dates%'
    ORDER BY "CreatedAt" DESC 
    LIMIT 5
  `);
  
  console.log(JSON.stringify(result.rows, null, 2));
  pool.end();
}

main().catch(console.error);
