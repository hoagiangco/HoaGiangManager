
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env.local from the root
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    console.log('Altering Device table...');
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL not found in .env.local');
        return;
    }
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await pool.query('ALTER TABLE "Device" ALTER COLUMN "Serial" TYPE VARCHAR(100)');
        console.log('Successfully increased Serial column length to 100.');
    } catch (err) {
        console.error('Error altering table:', err);
    } finally {
        await pool.end();
    }
}

run();
