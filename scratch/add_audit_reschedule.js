const fs = require('fs');

function addAuditReschedule() {
  const file1 = 'app/api/device-reminder-plans/[id]/reschedule/route.ts';
  let content1 = fs.readFileSync(file1, 'utf8');
  content1 = content1.replace(
    '    await service.reschedule(id, targetDateObj);',
    '    const existing = await service.getById(id);\n    await service.reschedule(id, targetDateObj);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, authorization.user.userId, \'UPDATE\', \'DeviceReminderPlans\', id.toString(), { title: existing?.title, nextDueDate: existing?.nextDueDate }, { nextDueDate: targetDateObj, action: \'Reschedule\' });'
  );
  fs.writeFileSync(file1, content1);
  console.log("Added to Reschedule Route");
}

function addAuditCancel() {
  const file2 = 'app/api/device-reminder-plans/[id]/cancel/route.ts';
  let content2 = fs.readFileSync(file2, 'utf8');
  content2 = content2.replace(
    '    await service.cancel(id);',
    '    const existing = await service.getById(id);\n    await service.cancel(id);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, authorization.user.userId, \'UPDATE\', \'DeviceReminderPlans\', id.toString(), { title: existing?.title, isActive: true }, { isActive: false, action: \'Cancel\' });'
  );
  fs.writeFileSync(file2, content2);
  console.log("Added to Cancel Route");
}

function addAuditRestore() {
  const file3 = 'app/api/device-reminder-plans/[id]/restore/route.ts';
  let content3 = fs.readFileSync(file3, 'utf8');
  content3 = content3.replace(
    '    await service.restore(id);',
    '    const existing = await service.getById(id);\n    await service.restore(id);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, authorization.user.userId, \'UPDATE\', \'DeviceReminderPlans\', id.toString(), { title: existing?.title, isActive: false }, { isActive: true, action: \'Restore\' });'
  );
  fs.writeFileSync(file3, content3);
  console.log("Added to Restore Route");
}

try { addAuditReschedule(); } catch(e) { console.error(e) }
try { addAuditCancel(); } catch(e) { console.error(e) }
try { addAuditRestore(); } catch(e) { console.error(e) }
