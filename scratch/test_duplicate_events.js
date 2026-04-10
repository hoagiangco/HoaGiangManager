require('dotenv').config({ path: '.env.local' });
const { DamageReportService } = require('../lib/services/damageReportService');
const { EventService } = require('../lib/services/eventService');
const pool = require('../lib/db').default;
const { DamageReportStatus, EventStatus } = require('../types');

async function testDuplicateEvents() {
  const drService = new DamageReportService();
  const eventService = new EventService();

  console.log('--- Starting Verification Test ---');

  try {
    // 1. Create a mock report
    const reportId = await drService.create({
      deviceId: 355, 
      reporterId: 3,
      reportingDepartmentId: 1,
      damageContent: 'Kiem tra trung lap su kien',
      status: 1, // Pending
      priority: 2, // Normal
      createdBy: 'test-user',
    });
    console.log(`Created report #${reportId}`);

    // 2. Simulate completion (InProgress -> Completed)
    // We bypass the API route and call services directly to simulate the logic
    console.log('Simulating completion 1...');
    const completedAt = new Date();
    await drService.updateStatus(reportId, 4, 'test-user'); // 4 = Completed
    await drService.updateCompletionDate(reportId, completedAt, 'test-user');

    // Simulate the logic in route.ts for creation
    const existingBefore = await eventService.getByRelatedReportId(reportId);
    if (!existingBefore) {
      await eventService.create({
        title: 'Hoàn thành xử lý - Test',
        deviceId: 355,
        eventTypeId: 1,
        description: 'Test description',
        status: 'completed',
        eventDate: completedAt,
        relatedReportId: reportId,
        createdBy: 'test-user',
      });
      console.log('Event 1 created');
    }

    // Verify 1 event exists
    let events = await pool.query('SELECT * FROM "Event" WHERE "RelatedReportID" = $1', [reportId]);
    console.log(`Events found after completion 1: ${events.rows.length}`);
    if (events.rows.length !== 1) throw new Error('Should have 1 event');

    const firstEventId = events.rows[0].ID;

    // 3. Simulate reopening (Completed -> InProgress)
    console.log('Simulating reopening (Completed -> InProgress)...');
    await drService.updateStatus(reportId, 3, 'test-user'); // 3 = InProgress
    
    // Simulate logic in route.ts for sync
    const eventToSync = await eventService.getByRelatedReportId(reportId);
    if (eventToSync) {
      await eventService.update({
        ...eventToSync,
        status: 'in-progress',
        updatedBy: 'test-user'
      });
      console.log('Event updated to in-progress');
    }

    // Verify still 1 event, but status is in-progress
    events = await pool.query('SELECT * FROM "Event" WHERE "RelatedReportID" = $1', [reportId]);
    console.log(`Events count: ${events.rows.length}, Status: ${events.rows[0].Status}`);
    if (events.rows.length !== 1) throw new Error('Should still have 1 event');

    // 4. Simulate completion again (InProgress -> Completed)
    console.log('Simulating completion 2...');
    await drService.updateStatus(reportId, 4, 'test-user');
    
    // Simulate logic in route.ts again
    const eventAgain = await eventService.getByRelatedReportId(reportId);
    if (eventAgain) {
      await eventService.update({
        ...eventAgain,
        status: 'completed',
        eventDate: new Date(),
        updatedBy: 'test-user'
      });
      console.log('Event updated back to completed');
    } else {
        // This shouldn't happen now
        await eventService.create({ /* ... */ });
    }

    // FINAL VERIFICATION
    events = await pool.query('SELECT * FROM "Event" WHERE "RelatedReportID" = $1', [reportId]);
    console.log(`Final event count for report #${reportId}: ${events.rows.length}`);
    
    if (events.rows.length === 1) {
      console.log('SUCCESS: Only one event exists and it was updated.');
    } else {
      console.log(`FAILURE: Found ${events.rows.length} events!`);
    }

    // Cleanup
    await pool.query('DELETE FROM "Event" WHERE "RelatedReportID" = $1', [reportId]);
    await pool.query('DELETE FROM "DamageReportHistory" WHERE "DamageReportID" = $1', [reportId]);
    await pool.query('DELETE FROM "DamageReport" WHERE "ID" = $1', [reportId]);
    console.log('Cleanup done.');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    process.exit();
  }
}

testDuplicateEvents();
