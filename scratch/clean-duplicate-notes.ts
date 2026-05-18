import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT "ID", "HandlerNotes" FROM "DamageReport" WHERE "HandlerNotes" IS NOT NULL AND "HandlerNotes" != ''`);
    let updatedCount = 0;

    for (const row of res.rows) {
      try {
        const notes = JSON.parse(row.HandlerNotes);
        if (Array.isArray(notes) && notes.length > 0) {
          // Group by date for 'auto' notes
          const cleanedNotes = [];
          const autoNotesByDate = new Map();

          // First pass: keep manual/legacy notes, identify last auto note per day
          for (const note of notes) {
            if (note.type === 'auto' && note.timestamp) {
              const dateStr = note.timestamp.split('T')[0];
              autoNotesByDate.set(dateStr, note); // Last one will override previous ones
            }
          }

          // Second pass: rebuild timeline
          for (const note of notes) {
            if (note.type === 'auto' && note.timestamp) {
              const dateStr = note.timestamp.split('T')[0];
              if (autoNotesByDate.get(dateStr).id === note.id) {
                cleanedNotes.push(note);
              }
            } else {
              cleanedNotes.push(note);
            }
          }

          if (cleanedNotes.length !== notes.length) {
            console.log(`Updating Report ID ${row.ID}: length from ${notes.length} to ${cleanedNotes.length}`);
            await client.query(`UPDATE "DamageReport" SET "HandlerNotes" = $1 WHERE "ID" = $2`, [JSON.stringify(cleanedNotes), row.ID]);
            updatedCount++;
          }
        }
      } catch (e) {
        // Skip non-JSON notes
      }
    }
    console.log(`Successfully cleaned duplicates for ${updatedCount} reports.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
