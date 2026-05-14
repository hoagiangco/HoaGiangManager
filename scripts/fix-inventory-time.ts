import pool from '../lib/db';

async function fixTime() {
  try {
    console.log('Altering SparePartTransaction table...');
    await pool.query('ALTER TABLE "SparePartTransaction" ALTER COLUMN "TransactionDate" TYPE TIMESTAMPTZ;');
    console.log('Successfully altered column to TIMESTAMPTZ.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

fixTime();
