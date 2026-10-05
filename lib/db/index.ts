import { Pool, types } from 'pg';
import dotenv from 'dotenv';
import { getDatabaseSslConfig } from './ssl';

dotenv.config();
// Also load from .env.local if it exists
dotenv.config({ path: '.env.local', override: true });

// Override pg DATE (OID 1082) parsing: return raw string instead of Date object
// This prevents timezone shift (e.g. "2026-06-05" becoming June 4 in UTC)
types.setTypeParser(1082, (val: string) => val);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: getDatabaseSslConfig(),
});

// Set timezone for all connections in the pool
pool.on('connect', (client) => {
  client.query("SET TIME ZONE 'Asia/Ho_Chi_Minh'");
});

export default pool;


// Helper function to execute queries
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    // Always log errors, even in production
    console.error('Database query error', { text, error });
    throw error;
  }
};

