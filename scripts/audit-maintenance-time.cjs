// Read-only characterization of current scheduling behavior. No database or API calls.
// Run: node scripts/audit-maintenance-time.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');

if (!process.argv.includes('--worker')) {
  for (const zone of ['Asia/Ho_Chi_Minh', 'UTC', 'America/Los_Angeles']) {
    process.stdout.write(execFileSync(process.execPath, [__filename, '--worker'], {
      env: { ...process.env, TZ: zone }, encoding: 'utf8',
    }));
  }
} else {
  const NativeDate = Date;
  class FixedDate extends NativeDate {
    constructor(...args) { super(...(args.length ? args : ['2026-09-10T05:00:00.000Z'])); }
    static now() { return new NativeDate('2026-09-10T05:00:00.000Z').getTime(); }
  }
  const filename = path.join(__dirname, '../lib/utils/maintenanceScheduler.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const sandbox = { exports: {}, require, Date: FixedDate };
  vm.runInNewContext(code, sandbox, { filename });
  const next = sandbox.exports.calculateNextDueDate;
  const date = text => new NativeDate(`${text}T00:00:00`);
  const ymd = value => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-');
  const week = { scheduleType: 'specific_dates', specificDaysOfWeek: [1, 4] };
  const cases = [
    ['day +3', '2026-09-10', 3, 'day', null, false, null],
    ['week +2', '2026-09-10', 2, 'week', null, false, null],
    ['month Jan 31', '2026-01-31', 1, 'month', null, false, null],
    ['month Mar 31', '2026-03-31', 1, 'month', null, false, null],
    ['leap year Feb 29', '2024-02-29', 1, 'year', null, false, null],
    ['Mon/Thu after Monday', '2026-09-07', 1, 'week', week, false, null],
    ['Mon/Thu after Thursday', '2026-09-10', 1, 'week', week, false, null],
    ['day 31 after Feb 28', '2026-02-28', 1, 'month', { scheduleType: 'specific_dates', specificDays: [31] }, false, null],
    ['days 30/31 after Feb 28', '2026-02-28', 1, 'month', { scheduleType: 'specific_dates', specificDays: [30, 31] }, false, null],
    ['day 31 after leap Feb 29', '2028-02-29', 1, 'month', { scheduleType: 'specific_dates', specificDays: [31] }, false, null],
    ['create interval in past', '2026-08-01', 1, 'month', null, true, '2026-08-01'],
    ['create specific dates in past', '2026-08-01', 1, 'month', { scheduleType: 'specific_dates', specificDays: [15] }, true, '2026-08-01'],
    ['edit future start Mon/Thu Nov 1', '2026-09-10', 1, 'week', week, false, '2026-11-01'],
    ['fortnight from Sep 7 evaluated Sep 14', '2026-09-14', 2, 'week', week, false, '2026-09-07'],
    ['annual day 15 with January anchor', '2026-09-10', 1, 'year', { scheduleType: 'specific_dates', specificDays: [15] }, false, '2026-01-15'],
    ['anchored monthly late completion', '2026-09-13', 1, 'month', null, false, '2026-09-10'],
  ];
  console.log(`\nTimezone: ${process.env.TZ}; frozen now: 2026-09-10T05:00:00Z`);
  for (const [label, current, interval, unit, config, first, anchor] of cases) {
    console.log(`${label}: ${ymd(next(date(current), interval, unit, config, first, anchor ? date(anchor) : null))}`);
  }
  const frontendCompletion = date('2026-09-13');
  frontendCompletion.setMonth(frontendCompletion.getMonth() + 1);
  console.log(`manual monthly late completion: ${ymd(frontendCompletion)}`);
  const today = date('2026-09-10');
  const sameDay = new NativeDate('2026-09-10T07:00:00');
  console.log(`upcoming API ceil for same calendar day at 07:00: ${Math.ceil((sameDay - today) / 86400000)}`);
  console.log(`local midnight Sep 10 through ISO date: ${date('2026-09-10').toISOString().split('T')[0]}`);
  const parsedInput = new NativeDate('2026-09-10');
  parsedInput.setHours(0, 0, 0, 0);
  console.log(`HTML date parsed then local midnight: ${ymd(parsedInput)}`);
}
