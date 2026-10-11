const fs = require('fs');

function addAuditReminderRoute() {
  const file1 = 'app/api/device-reminder-plans/route.ts';
  let content1 = fs.readFileSync(file1, 'utf8');
  content1 = content1.replace(
    '    const id = await service.create(planData);',
    '    const id = await service.create(planData);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'CREATE\', \'DeviceReminderPlans\', id.toString(), null, { title: planData.title, deviceId: planData.deviceId, reminderType: planData.reminderType });'
  );
  fs.writeFileSync(file1, content1);
}

function addAuditReminderIdRoute() {
  const file2 = 'app/api/device-reminder-plans/[id]/route.ts';
  let content2 = fs.readFileSync(file2, 'utf8');
  content2 = content2.replace(
    '    await service.update(planData);',
    '    await service.update(planData);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'UPDATE\', \'DeviceReminderPlans\', id.toString(), { title: existing?.title, intervalValue: existing?.intervalValue }, { title: planData.title, intervalValue: planData.intervalValue });'
  );
  content2 = content2.replace(
    '    await service.delete(id);',
    '    const existing = await service.getById(id);\n    await service.delete(id);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, authorization.user.userId, \'DELETE\', \'DeviceReminderPlans\', id.toString(), { title: existing?.title }, null);'
  );
  fs.writeFileSync(file2, content2);
}

function addAuditWeeklySchedule() {
  const file3 = 'app/api/weekly-schedule/route.ts';
  let content3 = fs.readFileSync(file3, 'utf8');
  content3 = content3.replace(
    '    if ((creatorSignatureUrl !== undefined || creatorName !== undefined) && weekStart) {\r\n      await svc.setCreatorSignature(weekStart, creatorSignatureUrl, creatorName);\r\n    }',
    '    if ((creatorSignatureUrl !== undefined || creatorName !== undefined) && weekStart) {\r\n      await svc.setCreatorSignature(weekStart, creatorSignatureUrl, creatorName);\r\n    }\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, authorization.user.userId, \'UPDATE\', \'WeeklySchedule\', weekStart, { action: \'Update Weekly Schedule\' }, { weekStart, cellsCount: cells?.length || 0 });'
  );
  content3 = content3.replace(
    '    if ((creatorSignatureUrl !== undefined || creatorName !== undefined) && weekStart) {\n      await svc.setCreatorSignature(weekStart, creatorSignatureUrl, creatorName);\n    }',
    '    if ((creatorSignatureUrl !== undefined || creatorName !== undefined) && weekStart) {\n      await svc.setCreatorSignature(weekStart, creatorSignatureUrl, creatorName);\n    }\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, authorization.user.userId, \'UPDATE\', \'WeeklySchedule\', weekStart, { action: \'Update Weekly Schedule\' }, { weekStart, cellsCount: cells?.length || 0 });'
  );
  fs.writeFileSync(file3, content3);
}

function updateAuditDropdown() {
  const file4 = 'app/(dashboard)/dashboard/audit-logs/page.tsx';
  let content4 = fs.readFileSync(file4, 'utf8');
  if (!content4.includes('value="DeviceReminderPlans"')) {
    content4 = content4.replace(
      '<option value="Events">Sự kiện (Events)</option>',
      '<option value="Events">Sự kiện (Events)</option>\n                <option value="DeviceReminderPlans">Lịch bảo trì (ReminderPlans)</option>\n                <option value="WeeklySchedule">Lịch tuần (WeeklySchedule)</option>'
    );
    fs.writeFileSync(file4, content4);
  }
}

try { addAuditReminderRoute(); console.log("Added to Reminder Route"); } catch (e) { console.log(e); }
try { addAuditReminderIdRoute(); console.log("Added to Reminder ID Route"); } catch (e) { console.log(e); }
try { addAuditWeeklySchedule(); console.log("Added to Weekly Schedule"); } catch (e) { console.log(e); }
try { updateAuditDropdown(); console.log("Added to Audit Dropdown"); } catch (e) { console.log(e); }
