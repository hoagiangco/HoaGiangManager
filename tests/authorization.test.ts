import assert from 'node:assert/strict';
import test from 'node:test';
import { hasPermission, Permission, Role } from '../lib/auth/permissions.ts';

test('SuperAdmin and Admin receive management permissions', () => {
  for (const role of [Role.SuperAdmin, Role.Admin]) {
    assert.equal(hasPermission([role], Permission.StaffManage), true);
    assert.equal(hasPermission([role], Permission.UserManage), true);
    assert.equal(hasPermission([role], Permission.MaintenanceManage), true);
    assert.equal(hasPermission([role], Permission.FileManage), true);
  }
});

test('only SuperAdmin receives work-plan and weekly-schedule management permissions', () => {
  assert.equal(hasPermission([Role.SuperAdmin], Permission.WorkPlanManage), true);
  assert.equal(hasPermission([Role.SuperAdmin], Permission.WeeklyScheduleManage), true);
  assert.equal(hasPermission([Role.Admin], Permission.WorkPlanManage), false);
  assert.equal(hasPermission([Role.Admin], Permission.WeeklyScheduleManage), false);
});

test('Supervisor and User cannot mutate administrative resources', () => {
  for (const role of [Role.Supervisor, Role.User]) {
    assert.equal(hasPermission([role], Permission.StaffManage), false);
    assert.equal(hasPermission([role], Permission.DepartmentManage), false);
    assert.equal(hasPermission([role], Permission.DeviceCategoryManage), false);
    assert.equal(hasPermission([role], Permission.EventTypeManage), false);
    assert.equal(hasPermission([role], Permission.LocationManage), false);
    assert.equal(hasPermission([role], Permission.FileManage), false);
  }
});

test('Supervisor and User retain maintenance execution permission', () => {
  assert.equal(hasPermission([Role.Supervisor], Permission.MaintenanceExecute), true);
  assert.equal(hasPermission([Role.User], Permission.MaintenanceExecute), true);
  assert.equal(hasPermission([], Permission.MaintenanceExecute), false);
  assert.equal(hasPermission(['UnknownRole'], Permission.MaintenanceExecute), false);
});
