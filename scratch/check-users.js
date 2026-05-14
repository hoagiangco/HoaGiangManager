import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import pool from '../lib/db/index.ts';

async function checkUser() {
  try {
    const res = await pool.query('SELECT "Username", "Role" FROM "User"');
    console.log('--- User Roles ---');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkUser();
