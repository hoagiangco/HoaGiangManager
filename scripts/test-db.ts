import pool from '../lib/db/index';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('📝 DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || 'Not set');
    
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    
    console.log('✅ Database connection successful!');
    console.log('⏰ Current time:', result.rows[0].current_time);
    console.log('📊 PostgreSQL version:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);
    
    // Check if database exists and has tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log(`\n📋 Found ${tablesResult.rows.length} tables in database:`);
    if (tablesResult.rows.length > 0) {
      tablesResult.rows.forEach((row: any) => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('   ⚠️  No tables found. Run migrations first!');
    }
    
    client.release();
    return true;
  } catch (error: any) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Suggestions:');
      console.error('   1. Make sure PostgreSQL is running');
      console.error('   2. Check if the port is correct (default: 5432)');
      console.error('   3. Verify DATABASE_URL in .env file');
    } else if (error.code === '3D000') {
      console.error('\n💡 Database does not exist. Create it first:');
      console.error('   CREATE DATABASE hoagiang_manager;');
    } else if (error.code === '28P01') {
      console.error('\n💡 Authentication failed. Check username and password in DATABASE_URL');
    }
    
    return false;
  } finally {
    await pool.end();
  }
}

testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

