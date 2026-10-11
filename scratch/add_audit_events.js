const fs = require('fs');

function addAuditEvents() {
  const file1 = 'app/api/events/route.ts';
  let content1 = fs.readFileSync(file1, 'utf8');
  content1 = content1.replace(
    '    const id = await eventService.create(eventData);',
    '    const id = await eventService.create(eventData);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'CREATE\', \'Events\', id.toString(), null, { title: eventData.title, status: eventData.status });'
  );
  fs.writeFileSync(file1, content1);

  const file2 = 'app/api/events/[id]/route.ts';
  let content2 = fs.readFileSync(file2, 'utf8');
  content2 = content2.replace(
    '    await eventService.update({ ...eventData, id });',
    '    await eventService.update({ ...eventData, id });\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'UPDATE\', \'Events\', id.toString(), { title: existingEvent?.title, status: existingEvent?.status }, { title: eventData.title, status: eventData.status });'
  );
  content2 = content2.replace(
    '    const result = await eventService.delete(id);',
    '    const result = await eventService.delete(id);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'DELETE\', \'Events\', id.toString(), { title: existingEvent?.title }, null);'
  );
  fs.writeFileSync(file2, content2);
}

try {
  addAuditEvents();
  console.log("Added Events");
} catch(e) { console.error("Events error", e) }
