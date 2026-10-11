const fs = require('fs');

function addAuditUsers() {
  const file1 = 'app/api/users/route.ts';
  let content1 = fs.readFileSync(file1, 'utf8');
  content1 = content1.replace(
    '    const userId = await userService.create(userData);',
    '    const userId = await userService.create(userData);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'CREATE\', \'Users\', userId, null, { email: userData.email, roles: userData.roles, fullName: userData.fullName });'
  );
  fs.writeFileSync(file1, content1);

  const file2 = 'app/api/users/[id]/route.ts';
  let content2 = fs.readFileSync(file2, 'utf8');
  content2 = content2.replace(
    '    await userService.update({ ...userData, id: params.id });',
    '    await userService.update({ ...userData, id: params.id });\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'UPDATE\', \'Users\', params.id, { email: targetUser?.email, roles: targetUser?.roles, fullName: targetUser?.fullName }, { email: userData.email, roles: userData.roles, fullName: userData.fullName });'
  );
  content2 = content2.replace(
    '    const result = await userService.delete(params.id);',
    '    const result = await userService.delete(params.id);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'DELETE\', \'Users\', params.id, { email: targetUser?.email, roles: targetUser?.roles, fullName: targetUser?.fullName }, null);'
  );
  fs.writeFileSync(file2, content2);
}

function addAuditDamageReports() {
  const file1 = 'app/api/damage-reports/route.ts';
  let content1 = fs.readFileSync(file1, 'utf8');
  content1 = content1.replace(
    '    const id = await damageReportService.create(reportData);',
    '    const id = await damageReportService.create(reportData);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'CREATE\', \'DamageReports\', id.toString(), null, { title: reportData.title, status: reportData.status, priority: reportData.priority, deviceId: reportData.deviceId });'
  );
  fs.writeFileSync(file1, content1);

  const file2 = 'app/api/damage-reports/[id]/route.ts';
  let content2 = fs.readFileSync(file2, 'utf8');
  content2 = content2.replace(
    '    await damageReportService.update(reportData);',
    '    await damageReportService.update(reportData);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'UPDATE\', \'DamageReports\', id.toString(), { title: existingReport?.title, status: existingReport?.status, handlerId: existingReport?.handlerId, priority: existingReport?.priority }, { title: reportData.title, status: reportData.status, handlerId: reportData.handlerId, priority: reportData.priority });'
  );
  content2 = content2.replace(
    '      result = await damageReportService.delete(id);',
    '      result = await damageReportService.delete(id);\n      const { logAudit } = await import(\'@/lib/services/auditService\');\n      await logAudit(null, user.userId, \'DELETE\', \'DamageReports\', id.toString(), { title: "Deleted", isHardDelete: true }, null);'
  );
  content2 = content2.replace(
    '      result = await damageReportService.softDelete(id, user.userId);',
    '      result = await damageReportService.softDelete(id, user.userId);\n      const { logAudit } = await import(\'@/lib/services/auditService\');\n      await logAudit(null, user.userId, \'DELETE\', \'DamageReports\', id.toString(), { title: "Soft deleted" }, null);'
  );
  fs.writeFileSync(file2, content2);
}

function addAuditWorkPlans() {
  const file1 = 'app/api/work-plans/route.ts';
  let content1 = fs.readFileSync(file1, 'utf8');
  content1 = content1.replace(
    '    const id = await workPlanService.create(planData);',
    '    const id = await workPlanService.create(planData);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'CREATE\', \'WorkPlans\', id.toString(), null, { title: planData.title, type: planData.type, priority: planData.priority });'
  );
  fs.writeFileSync(file1, content1);

  const file2 = 'app/api/work-plans/[id]/route.ts';
  let content2 = fs.readFileSync(file2, 'utf8');
  content2 = content2.replace(
    '    await workPlanService.update(planData);',
    '    await workPlanService.update(planData);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'UPDATE\', \'WorkPlans\', id.toString(), { title: existingPlan?.title, status: existingPlan?.status }, { title: planData.title, status: planData.status });'
  );
  content2 = content2.replace(
    '    const result = await workPlanService.delete(id);',
    '    const result = await workPlanService.delete(id);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'DELETE\', \'WorkPlans\', id.toString(), { title: existingPlan?.title }, null);'
  );
  fs.writeFileSync(file2, content2);
}

try {
  addAuditUsers();
  console.log("Added Users");
} catch(e) { console.error("Users error", e) }

try {
  addAuditDamageReports();
  console.log("Added DamageReports");
} catch(e) { console.error("DamageReports error", e) }

try {
  addAuditWorkPlans();
  console.log("Added WorkPlans");
} catch(e) { console.error("WorkPlans error", e) }
