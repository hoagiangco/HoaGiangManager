import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const isLocalhost = process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.NODE_ENV === 'production' && !isLocalhost) ? { rejectUnauthorized: false } : false,
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

