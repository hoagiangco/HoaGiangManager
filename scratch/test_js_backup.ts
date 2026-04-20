import dotenv from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function testJsBackup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL not found');
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    // 1. Get all tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('_prisma_migrations', 'migrations')
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Tables to backup:', tables);

    let sql = `-- Pure JS Backup\n-- Created: ${new Date().toISOString()}\n\n`;
    sql += `SET statement_timeout = 0;\nSET client_encoding = 'UTF8';\n\n`;

    for (const table of tables) {
      console.log(`Backing up table: ${table}`);
      
      // Get table data
      const dataRes = await client.query(`SELECT * FROM "${table}"`);
      if (dataRes.rows.length === 0) continue;

      sql += `-- Data for table ${table}\n`;
      sql += `TRUNCATE TABLE "${table}" CASCADE;\n`;

      const columns = dataRes.fields.map(f => f.name);
      const columnNames = columns.map(c => `"${c}"`).join(', ');

      for (const row of dataRes.rows) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return val;
        });
        sql += `INSERT INTO "${table}" (${columnNames}) VALUES (${values.join(', ')});\n`;
      }
      sql += `\n`;
    }

    const outputPath = path.join(process.cwd(), 'scratch/test_backup.sql');
    fs.writeFileSync(outputPath, sql);
    console.log(`Backup saved to ${outputPath}`);

  } catch (error) {
    console.error('Backup test failed:', error);
  } finally {
    await client.end();
  }
}

testJsBackup();
