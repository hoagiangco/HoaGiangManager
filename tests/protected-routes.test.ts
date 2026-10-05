import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

const protectedRoutes: Array<[string, string]> = [
  ['app/api/staff/route.ts', 'Permission.StaffManage'],
  ['app/api/staff/[id]/route.ts', 'Permission.StaffManage'],
  ['app/api/staff/sync-names/route.ts', 'Permission.StaffManage'],
  ['app/api/users/route.ts', 'Permission.UserManage'],
  ['app/api/users/[id]/route.ts', 'Permission.UserManage'],
  ['app/api/users/[id]/lock/route.ts', 'Permission.UserManage'],
  ['app/api/users/[id]/change-password/route.ts', 'Permission.UserManage'],
  ['app/api/users/roles/route.ts', 'Permission.UserManage'],
  ['app/api/departments/route.ts', 'Permission.DepartmentManage'],
  ['app/api/departments/[id]/route.ts', 'Permission.DepartmentManage'],
  ['app/api/device-categories/route.ts', 'Permission.DeviceCategoryManage'],
  ['app/api/device-categories/[id]/route.ts', 'Permission.DeviceCategoryManage'],
  ['app/api/event-types/route.ts', 'Permission.EventTypeManage'],
  ['app/api/event-types/[id]/route.ts', 'Permission.EventTypeManage'],
  ['app/api/locations/route.ts', 'Permission.LocationManage'],
  ['app/api/locations/[id]/route.ts', 'Permission.LocationManage'],
  ['app/api/files/upload/route.ts', 'Permission.FileManage'],
  ['app/api/files/rename/route.ts', 'Permission.FileManage'],
  ['app/api/files/delete/route.ts', 'Permission.FileManage'],
  ['app/api/device-reminder-plans/route.ts', 'Permission.MaintenanceManage'],
  ['app/api/device-reminder-plans/bulk/route.ts', 'Permission.MaintenanceManage'],
  ['app/api/device-reminder-plans/[id]/route.ts', 'Permission.MaintenanceManage'],
  ['app/api/device-reminder-plans/[id]/cancel/route.ts', 'Permission.MaintenanceManage'],
  ['app/api/device-reminder-plans/[id]/reschedule/route.ts', 'Permission.MaintenanceManage'],
  ['app/api/device-reminder-plans/[id]/restore/route.ts', 'Permission.MaintenanceManage'],
  ['app/api/work-plans/route.ts', 'Permission.WorkPlanManage'],
  ['app/api/work-plans/active-dates/route.ts', 'Permission.WorkPlanManage'],
  ['app/api/work-plans/overdue/route.ts', 'Permission.WorkPlanManage'],
  ['app/api/work-plans/pending/route.ts', 'Permission.WorkPlanManage'],
  ['app/api/work-plans/[id]/route.ts', 'Permission.WorkPlanManage'],
  ['app/api/work-plans/[id]/implement/route.ts', 'Permission.WorkPlanManage'],
  ['app/api/weekly-schedule/route.ts', 'Permission.WeeklyScheduleManage'],
  ['app/api/weekly-schedule/staff/route.ts', 'Permission.WeeklyScheduleManage'],
  ['app/api/weekly-schedule/export/route.ts', 'Permission.WeeklyScheduleManage'],
];

test('administrative route files use the centralized permission guard', () => {
  for (const [route, permission] of protectedRoutes) {
    const source = readFileSync(resolve(repositoryRoot, route), 'utf8');
    assert.match(source, /requirePermission\(/, `${route} must call requirePermission`);
    assert.ok(source.includes(permission), `${route} must require ${permission}`);
  }
});

test('every non-public API route declares an authentication guard', () => {
  const apiRoot = resolve(repositoryRoot, 'app/api');
  const publicRoutes = new Set([
    'auth/forgot-password/route.ts',
    'auth/login/route.ts',
    'auth/register/route.ts',
    'auth/reset-password/route.ts',
    'health/route.ts',
  ]);

  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absolutePath);
        continue;
      }
      if (entry.name !== 'route.ts') continue;

      const relativePath = absolutePath.slice(apiRoot.length + 1).replaceAll('\\', '/');
      if (publicRoutes.has(relativePath)) continue;

      const source = readFileSync(absolutePath, 'utf8');
      assert.match(
        source,
        /(?:authenticate|requirePermission)\(/,
        `${relativePath} must authenticate requests`
      );
    }
  };

  visit(apiRoot);
});
