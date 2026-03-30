const { Client } = require('pg'); 
const fs = require('fs');
const client = new Client({ connectionString: 'postgresql://neondb_owner:npg_GqcJydb1LuK5@ep-patient-smoke-a1ekhm8f-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' }); 
client.connect()
  .then(() => client.query('SELECT * FROM "DamageReport" WHERE "ID" = 47'))
  .then(res => { 
    fs.writeFileSync('db_dump.txt', 'Report 47: ' + JSON.stringify(res.rows[0], null, 2) + '\n');
    return client.query('SELECT * FROM "Event" WHERE "RelatedReportID" = 47 OR "Metadata"::text LIKE \'%batch-2025-11-18-1763430857529%\''); 
  })
  .then(res => { 
    fs.appendFileSync('db_dump.txt', 'Events: ' + JSON.stringify(res.rows, null, 2));
    client.end(); 
  }).catch(console.error);
