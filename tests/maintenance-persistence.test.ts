import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as calendar from '../lib/utils/maintenanceScheduler.ts';

// Execute real service code with a fake database; never connect to the shared production DB.
function load(file: string, dependencies: Record<string, unknown>) {
  const exports: Record<string, any> = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, module: { exports }, console,
    require: (name: string) => {
      if (!(name in dependencies)) throw new Error(`Unmocked dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: file });
  return exports;
}

function harness(failSchedule = false, oldStatus = 'in_progress') {
  const calls: { sql: string; values?: any[] }[] = [];
  let releases = 0;
  const client = {
    release() { releases++; },
    async query(sql: string, values?: any[]) {
      calls.push({ sql, values });
      if (sql.includes('FROM "DeviceReminderPlan"')) return { rows: [{ ID: 5,
        startFrom: '2026-01-31', nextDueDate: '2026-09-30', intervalValue: 1, intervalUnit: 'month', metadata: {},
      }] };
      if (sql.includes('UPDATE "DeviceReminderPlan"') && failSchedule) throw new Error('schedule write failed');
      if (sql.includes('MAX("ID")')) return { rows: [{ max_id: 1 }] };
      if (sql.includes('last_value')) return { rows: [{ last_value: 1, is_called: true }] };
      if (sql.includes('SELECT "Status"')) return { rows: [{ Status: oldStatus }] };
      if (sql.includes('INSERT INTO "Event"')) return { rows: [{ ID: 22 }] };
      return { rows: [] };
    },
  };
  const pool = { connect: async () => client, query: client.query };
  const schedule = load('lib/services/maintenanceScheduleService.ts', {
    '../db': pool, '../utils/maintenanceScheduler': { ...calendar, maintenanceToday: () => '2026-10-02' },
  });
  const events = load('lib/services/eventService.ts', {
    '../db': pool, './maintenanceScheduleService': schedule,
    '../utils/maintenanceScheduler': calendar,
    '../utils/dateFormat': { getVNNow: () => new Date('2026-10-02') },
    '@/types': { EventStatus: { Completed: 'completed' } },
    './notificationService': { NotificationService: class { async createNotification() {} }, NotificationType: {}, NotificationCategory: {} },
  });
  return { calls, client, schedule, service: new events.EventService(), releases: () => releases };
}

const event = { id: 22, eventTypeId: 1, deviceId: 10, status: 'completed',
  endDate: new Date('2026-10-02'), metadata: { maintenanceBatchId: 'test-batch', maintenancePlanId: 5 } };

test('event creation commits its anchored schedule in the same transaction', async () => {
  const h = harness();
  assert.equal(await h.service.create(event), 22);
  const scheduleIndex = h.calls.findIndex(c => c.sql.includes('UPDATE "DeviceReminderPlan"'));
  assert.equal(h.calls[scheduleIndex].values?.[0], '2026-10-31');
  assert.ok(h.calls.findIndex(c => c.sql === 'COMMIT') > scheduleIndex);
  assert.equal(h.calls.filter(c => c.sql === 'BEGIN').length, 1);
  assert.equal(h.releases(), 1);
});

test('failed schedule update rolls back event creation and releases connection', async () => {
  const h = harness(true);
  await assert.rejects(() => h.service.create(event), /schedule write failed/);
  assert.ok(h.calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(!h.calls.some(c => c.sql === 'COMMIT'));
  assert.equal(h.releases(), 1);
});

test('failed schedule update rolls back event completion', async () => {
  const h = harness(true);
  await assert.rejects(() => h.service.update(event), /schedule write failed/);
  assert.ok(h.calls.some(c => c.sql.includes('FOR UPDATE')));
  assert.ok(h.calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(!h.calls.some(c => c.sql === 'COMMIT'));
});

test('editing an already-completed event does not advance another calendar occurrence', async () => {
  const h = harness(false, 'completed');
  await h.service.update(event);
  assert.ok(!h.calls.some(c => c.sql.includes('FROM "DeviceReminderPlan"')));
});

test('schedule advancement cannot run with an unscoped request', async () => {
  const h = harness();
  await h.schedule.advanceMaintenanceSchedule({});
  assert.equal(h.calls.length, 0);
});

test('cron catches missed days, creates planned occurrences, and does not duplicate a second run', async () => {
  let due: string | null = '2026-09-07';
  const inserts: any[][] = [];
  const client = { release() {}, async query(sql: string, values?: any[]) {
    if (sql.startsWith('SELECT "ID" FROM "DeviceReminderPlan"')) return { rows: due && due <= '2026-09-10' ? [{ ID: 5 }] : [] };
    if (sql.includes('FOR UPDATE')) return { rows: [{ ID: 5, IsActive: true, due_day: due,
      anchor_day: '2026-09-07', end_day: null, DeviceID: 10, EventTypeID: 1,
      IntervalValue: 1, IntervalUnit: 'day', Metadata: { maintenanceBatchId: 'batch' },
    }] };
    if (sql.includes('INSERT INTO "Event"')) inserts.push(values!);
    if (sql.includes('UPDATE "DeviceReminderPlan"')) due = values![0];
    return { rows: [] };
  } };
  const cron = load('scripts/check-maintenance-reminders.ts', {
    '../lib/db': { connect: async () => client },
    '../lib/utils/maintenanceScheduler': { ...calendar, maintenanceToday: () => '2026-09-10' },
  });
  await cron.checkMaintenanceReminders();
  assert.deepEqual(inserts.map(v => v[4]), ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10']);
  assert.equal(due, '2026-09-11');
  assert.equal(JSON.parse(inserts[0][5]).scheduledDueDate, '2026-09-07');
  await cron.checkMaintenanceReminders();
  assert.equal(inserts.length, 4);
});
