const fs = require('fs');

function addAuditStaff() {
  const file1 = 'app/api/staff/route.ts';
  let content1 = fs.readFileSync(file1, 'utf8');
  content1 = content1.replace(
    '    const id = await staffService.create(staffData);',
    '    const id = await staffService.create(staffData);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'CREATE\', \'Staff\', id.toString(), null, { name: staffData.name, email: staffData.email, departmentId: staffData.departmentId });'
  );
  fs.writeFileSync(file1, content1);

  const file2 = 'app/api/staff/[id]/route.ts';
  let content2 = fs.readFileSync(file2, 'utf8');
  content2 = content2.replace(
    '    await staffService.update(staffData);',
    '    await staffService.update(staffData);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'UPDATE\', \'Staff\', id.toString(), { name: existingStaff?.name, departmentId: existingStaff?.departmentId, email: existingStaff?.email }, { name: staffData.name, departmentId: staffData.departmentId, email: staffData.email });'
  );
  content2 = content2.replace(
    '    const result = await staffService.delete(id);',
    '    const result = await staffService.delete(id);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'DELETE\', \'Staff\', id.toString(), { name: existingStaff?.name }, null);'
  );
  fs.writeFileSync(file2, content2);
}

function addAuditDepartments() {
  const file1 = 'app/api/departments/route.ts';
  let content1 = fs.readFileSync(file1, 'utf8');
  content1 = content1.replace(
    '    const id = await deptService.create(deptData);',
    '    const id = await deptService.create(deptData);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'CREATE\', \'Departments\', id.toString(), null, { code: deptData.code, name: deptData.name });'
  );
  fs.writeFileSync(file1, content1);

  const file2 = 'app/api/departments/[id]/route.ts';
  let content2 = fs.readFileSync(file2, 'utf8');
  content2 = content2.replace(
    '    await deptService.update(deptData);',
    '    await deptService.update(deptData);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'UPDATE\', \'Departments\', id.toString(), { code: existingDept?.code, name: existingDept?.name }, { code: deptData.code, name: deptData.name });'
  );
  content2 = content2.replace(
    '    const result = await deptService.delete(id);',
    '    const result = await deptService.delete(id);\n\n    const { logAudit } = await import(\'@/lib/services/auditService\');\n    await logAudit(null, user.userId, \'DELETE\', \'Departments\', id.toString(), { name: existingDept?.name }, null);'
  );
  fs.writeFileSync(file2, content2);
}

try {
  addAuditStaff();
  console.log("Added Staff");
} catch(e) { console.error("Staff error", e) }

try {
  addAuditDepartments();
  console.log("Added Departments");
} catch(e) { console.error("Departments error", e) }
