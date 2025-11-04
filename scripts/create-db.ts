import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL || '';
// Parse database URL to get connection info without database name
const urlMatch = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

if (!urlMatch) {
  console.error('❌ Invalid DATABASE_URL format');
  process.exit(1);
}

const [, username, password, host, port, dbName] = urlMatch;

// Connect to postgres database to create the target database
const adminPool = new Pool({
  user: username,
  password: password,
  host: host,
  port: parseInt(port),
  database: 'postgres', // Connect to default postgres database
});

async function createDatabase() {
  try {
    console.log('🔍 Connecting to PostgreSQL...');
    const client = await adminPool.connect();
    
    // Check if database exists
    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (checkResult.rows.length > 0) {
      console.log(`✅ Database "${dbName}" already exists`);
      client.release();
      await adminPool.end();
      return true;
    }
    
    // Create database
    console.log(`📦 Creating database "${dbName}"...`);
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✅ Database "${dbName}" created successfully!`);
    
    client.release();
    await adminPool.end();
    return true;
  } catch (error: any) {
    console.error('❌ Failed to create database:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 PostgreSQL server is not running or not accessible');
    } else if (error.code === '28P01') {
      console.error('\n💡 Authentication failed. Check username and password');
    }
    
    return false;
  }
}

createDatabase()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

