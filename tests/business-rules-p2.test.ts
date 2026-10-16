import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadModule(file: string, dependencies: Record<string, unknown>) {
  const exports: Record<string, any> = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;

  vm.runInNewContext(
    code,
    {
      exports,
      module: { exports },
      console,
      require: (name: string) => {
        if (name in dependencies) return dependencies[name];
        if (name === '@/types' || name === '../types' || name === '../../types') {
          return {
            DamageReportStatus: { Pending: 1, Assigned: 2, InProgress: 3, Completed: 4, Cancelled: 5 },
            DeviceStatus: { DangSuDung: 1, DangSuaChua: 2, HuHong: 3, DaThanhLy: 4, CoHuHong: 5 },
            SparePartTransactionType: { In: 'IN', Out: 'OUT' },
            EventStatus: { Completed: 'completed' },
          };
        }
        if (name === './maintenanceScheduleService') {
          return { advanceMaintenanceSchedule: async () => {} };
        }
        if (name === './eventService') {
          return { EventService: class { async create() { return 1; } } };
        }
        if (name === './notificationService') {
          return {
            NotificationService: class { async createNotification() {} },
            NotificationType: { Report: 'Report' },
            NotificationCategory: { New: 'New' },
          };
        }
        if (name === '../utils/dateFormat') {
          return { getVNNow: () => new Date('2026-10-16T12:00:00Z') };
        }
        if (name === '../utils/maintenanceScheduler') {
          return { maintenanceDay: () => '2026-10-16' };
        }
        throw new Error(`Unmocked dependency in test: ${name}`);
      },
    },
    { filename: file }
  );
  return exports;
}

// -------------------------------------------------------------
// Test Group 1: WeeklyScheduleService Boundary & Transaction
// -------------------------------------------------------------

test('WeeklyScheduleService: saveCompleteWeek rejects cells outside target week boundary', async () => {
  const calls: { sql: string; values?: any[] }[] = [];
  const client = {
    release() {},
    async query(sql: string, values?: any[]) {
      calls.push({ sql, values });
      return { rows: [] };
    },
  };
  const fakePool = { connect: async () => client, query: client.query };

  const mod = loadModule('lib/services/weeklyScheduleService.ts', {
    '../db': fakePool,
  });
  const service = new mod.WeeklyScheduleService();

  // Week starts Monday 2026-10-12. Target cell has 2026-10-20 (next week).
  await assert.rejects(
    async () => {
      await service.saveCompleteWeek({
        weekStart: '2026-10-12',
        cells: [
          {
            weekStartDate: '2026-10-20', // Belongs to week 2026-10-19
            staffId: 10,
            dayOfWeek: 2,
            content: 'Invalid week cell',
          },
        ],
        userId: 'admin-1',
      });
    },
    /không thuộc tuần đang lưu/
  );

  // Assert that no cell INSERT was performed
  assert.ok(!calls.some((c) => c.sql.includes('INSERT INTO "WeeklySchedule"')));
});

test('WeeklyScheduleService: saveCompleteWeek commits cells and note in single transaction', async () => {
  const calls: { sql: string; values?: any[] }[] = [];
  let released = false;
  const client = {
    release() {
      released = true;
    },
    async query(sql: string, values?: any[]) {
      calls.push({ sql, values });
      return { rows: [] };
    },
  };
  const fakePool = { connect: async () => client, query: client.query };

  const mod = loadModule('lib/services/weeklyScheduleService.ts', {
    '../db': fakePool,
  });
  const service = new mod.WeeklyScheduleService();

  await service.saveCompleteWeek({
    weekStart: '2026-10-12',
    cells: [
      {
        weekStartDate: '2026-10-12',
        staffId: 5,
        dayOfWeek: 1,
        content: 'Bảo trì trạm bơm',
      },
    ],
    weeklyNote: 'Ghi chú tuần 42',
    userId: 'admin-1',
  });

  assert.ok(
    calls.some((c) => c.sql.includes('INSERT INTO "WeeklySchedule"')),
    'Must insert schedule cell'
  );
  assert.ok(
    calls.some((c) => c.sql.includes('INSERT INTO "WeeklyScheduleNote"')),
    'Must insert weekly note'
  );
  assert.ok(calls.some((c) => c.sql === 'COMMIT'), 'Must commit transaction');
  assert.equal(released, true, 'Must release client connection');
});

// -------------------------------------------------------------
// Test Group 2: SparePartService Data Integrity & Filters
// -------------------------------------------------------------

test('SparePartService: delete fails when spare part has transaction history', async () => {
  const calls: { sql: string; values?: any[] }[] = [];
  const fakePool = {
    query: async (sql: string, values?: any[]) => {
      calls.push({ sql, values });
      if (sql.includes('FROM "SparePartTransaction" WHERE "SparePartID"')) {
        return { rows: [{ count: 3 }] }; // 3 transactions exist
      }
      return { rows: [] };
    },
  };

  const mod = loadModule('lib/services/sparePartService.ts', {
    '../db': fakePool,
  });
  const service = new mod.SparePartService();

  await assert.rejects(
    async () => {
      await service.delete(99);
    },
    /Không thể xóa vật tư đã có lịch sử giao dịch/
  );

  // Verify that DELETE FROM "SparePart" was NOT called
  assert.ok(!calls.some((c) => c.sql.includes('DELETE FROM "SparePart"')));
});

test('SparePartService: delete succeeds when spare part has no transactions', async () => {
  const calls: { sql: string; values?: any[] }[] = [];
  const fakePool = {
    query: async (sql: string, values?: any[]) => {
      calls.push({ sql, values });
      if (sql.includes('FROM "SparePartTransaction" WHERE "SparePartID"')) {
        return { rows: [{ count: 0 }] };
      }
      return { rows: [] };
    },
  };

  const mod = loadModule('lib/services/sparePartService.ts', {
    '../db': fakePool,
  });
  const service = new mod.SparePartService();

  await service.delete(101);

  assert.ok(
    calls.some(
      (c) => c.sql.includes('DELETE FROM "SparePart"') && c.values?.[0] === 101
    )
  );
});

test('SparePartService: getTransactions uses inclusive date boundary for endDate', async () => {
  let capturedCountSql = '';
  const fakePool = {
    query: async (sql: string, values?: any[]) => {
      if (sql.includes('COUNT(*)')) {
        capturedCountSql = sql;
        return { rows: [{ count: '0' }] };
      }
      return { rows: [] };
    },
  };

  const mod = loadModule('lib/services/sparePartService.ts', {
    '../db': fakePool,
  });
  const service = new mod.SparePartService();

  await service.getTransactions({
    startDate: '2026-10-01',
    endDate: '2026-10-16',
  });

  assert.ok(
    capturedCountSql.includes(">= $1::date"),
    'Must filter startDate with >= date cast'
  );
  assert.ok(
    capturedCountSql.includes("< ($2::date + INTERVAL '1 day')"),
    'Must filter endDate inclusively with < date + 1 day'
  );
});

test('SparePartService: createTransaction prevents duplicate submissions within debounce window', async () => {
  const calls: { sql: string; values?: any[] }[] = [];
  let released = false;
  const client = {
    release() {
      released = true;
    },
    async query(sql: string, values?: any[]) {
      calls.push({ sql, values });
      if (sql.includes('INTERVAL \'3 seconds\'')) {
        return { rows: [{ ID: 555 }] }; // duplicate found!
      }
      return { rows: [] };
    },
  };
  const fakePool = { connect: async () => client, query: client.query };

  const mod = loadModule('lib/services/sparePartService.ts', {
    '../db': fakePool,
  });
  const service = new mod.SparePartService();

  const resultId = await service.createTransaction({
    sparePartId: 10,
    type: 'OUT' as any,
    quantity: 2,
    createdBy: 'staff-user-id',
  });

  // Idempotent return of existing transaction ID
  assert.equal(resultId, 555, 'Must return existing transaction ID without duplicate insert');
  assert.ok(calls.some((c) => c.sql === 'ROLLBACK'), 'Must roll back new transaction attempt');
  assert.ok(!calls.some((c) => c.sql.includes('INSERT INTO "SparePartTransaction"')), 'Must not insert duplicate');
  assert.equal(released, true, 'Must release connection');
});

// -------------------------------------------------------------
// Test Group 3: Device State Preservation on Report Completion
// -------------------------------------------------------------

test('DamageReportService: syncDeviceStatus preserves finalDeviceStatus override when no other reports active', async () => {
  const updates: { sql: string; values?: any[] }[] = [];
  const fakeClient = {
    query: async (sql: string, values?: any[]) => {
      if (sql.includes('FROM "DamageReport"') && sql.includes('"Status"::text IN (\'1\', \'2\', \'3\')')) {
        // No other active reports
        return { rows: [] };
      }
      if (sql.includes('UPDATE "Device" SET "Status"')) {
        updates.push({ sql, values });
        return { rows: [] };
      }
      return { rows: [] };
    },
  };

  const fakePool = {
    connect: async () => fakeClient,
    query: fakeClient.query,
  };

  const mod = loadModule('lib/services/damageReportService.ts', {
    '../db': fakePool,
  });

  const service = new mod.DamageReportService();
  // Call syncDeviceStatus with finalDeviceStatusOverride = 1 (DangSuDung)
  await (service as any).syncDeviceStatus(42, fakeClient, 1);

  assert.equal(updates.length, 1);
  assert.equal(updates[0].values?.[0], '1', 'Device status must be updated to overridden status 1');
  assert.equal(updates[0].values?.[1], 42, 'Device ID must match');
});

test('DamageReportService: syncDeviceStatus forces DangSuaChua if another report is InProgress', async () => {
  const updates: { sql: string; values?: any[] }[] = [];
  const fakeClient = {
    query: async (sql: string, values?: any[]) => {
      if (sql.includes('FROM "DamageReport"') && sql.includes('"Status"::text IN (\'1\', \'2\', \'3\')')) {
        // Another report is currently InProgress (status 3)
        return { rows: [{ status: 3 }] };
      }
      if (sql.includes('UPDATE "Device" SET "Status"')) {
        updates.push({ sql, values });
        return { rows: [] };
      }
      return { rows: [] };
    },
  };

  const fakePool = {
    connect: async () => fakeClient,
    query: fakeClient.query,
  };

  const mod = loadModule('lib/services/damageReportService.ts', {
    '../db': fakePool,
  });

  const service = new mod.DamageReportService();
  // Even if user requests finalDeviceStatus = 1, active report with InProgress forces status 2 (DangSuaChua)
  await (service as any).syncDeviceStatus(42, fakeClient, 1);

  assert.equal(updates.length, 1);
  assert.equal(updates[0].values?.[0], '2', 'Device status must remain 2 (DangSuaChua) while active report is InProgress');
});
