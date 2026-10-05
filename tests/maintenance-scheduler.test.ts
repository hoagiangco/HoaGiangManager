import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateNextDueDay as next, advanceScheduledDueDay as advance, maintenanceDay, maintenanceDaysBetween } from '../lib/utils/maintenanceScheduler.ts';

test('monthly schedules retain the original day after short months', () => {
  assert.equal(next('2026-01-31', 1, 'month', null, false, '2026-01-31'), '2026-02-28');
  assert.equal(next('2026-02-28', 1, 'month', null, false, '2026-01-31'), '2026-03-31');
  assert.equal(next('2026-03-31', 1, 'month', null, false, '2026-01-31'), '2026-04-30');
});

test('annual schedules recover leap day without drifting to March', () => {
  assert.equal(next('2024-02-29', 1, 'year', null, false, '2024-02-29'), '2025-02-28');
  assert.equal(next('2027-02-28', 1, 'year', null, false, '2024-02-29'), '2028-02-29');
});

test('specific month days advance after clamping and do not repeat the same date', () => {
  const config = { scheduleType: 'specific_dates' as const, specificDays: [30, 31] };
  assert.equal(next('2026-02-27', 1, 'month', config, false, '2026-01-01'), '2026-02-28');
  assert.equal(next('2026-02-28', 1, 'month', config, false, '2026-01-01'), '2026-03-30');
  assert.equal(next('2028-02-29', 1, 'month', config, false, '2026-01-01'), '2028-03-30');
});

const weekly = { scheduleType: 'specific_dates' as const, specificDaysOfWeek: [1, 4] };
test('multiple weekdays preserve the configured fortnight anchor', () => {
  assert.equal(next('2026-09-07', 1, 'week', weekly, false, '2026-09-07'), '2026-09-10');
  assert.equal(next('2026-09-10', 2, 'week', weekly, false, '2026-09-07'), '2026-09-21');
  assert.equal(next('2026-09-14', 2, 'week', weekly, false, '2026-09-07'), '2026-09-21');
});

test('edits cannot schedule before StartFrom, including specific dates', () => {
  assert.equal(next('2026-09-10', 1, 'week', weekly, true, '2026-11-01'), '2026-11-02');
  assert.equal(next('2026-09-10', 2, 'month', { scheduleType: 'specific_dates', specificDays: [5, 20] }, true, '2026-11-10'), '2026-11-20');
});

test('annual specific days remain in the configured month', () => {
  assert.equal(next('2026-09-10', 1, 'year', { scheduleType: 'specific_dates', specificDays: [15] }, false, '2026-01-15'), '2027-01-15');
});

test('first occurrence includes StartFrom; advancing is strictly later and has no implicit today', () => {
  assert.equal(next('2026-08-01', 1, 'month', null, true, '2026-08-01'), '2026-08-01');
  assert.equal(next('2026-08-01', 1, 'month', { scheduleType: 'specific_dates', specificDays: [15] }, true, '2026-08-01'), '2026-08-15');
  assert.equal(next('2026-09-10', 3, 'day', null, false, '2026-09-10'), '2026-09-13');
});

const plan = { startFrom: '2026-09-10', nextDueDate: '2026-09-10', intervalValue: 1, intervalUnit: 'month' };
test('completion dates cannot move the monthly anchor; early completion keeps future due date', () => {
  for (const completedAt of ['2026-09-08', '2026-09-10', '2026-09-13', '2026-09-30']) {
    // CompletedAt is deliberately not an input to the calendar calculation.
    const record = { ...plan, completedAt };
    assert.equal(advance(record, '2026-09-13'), '2026-10-10');
  }
  assert.equal(advance(plan, '2026-09-08'), '2026-09-10');
  assert.equal(advance(plan, '2026-11-13'), '2026-12-10');
});

test('cron advancement and repeated completion do not advance twice', () => {
  const nextDueDate = advance(plan, '2026-09-10');
  assert.equal(nextDueDate, '2026-10-10');
  assert.equal(advance({ ...plan, nextDueDate }, '2026-09-10'), nextDueDate);
});

test('reschedule affects only the current occurrence, then resumes the original calendar', () => {
  assert.equal(advance({ ...plan, nextDueDate: '2026-09-13' }, '2026-09-10'), '2026-09-13');
  assert.equal(advance({ ...plan, nextDueDate: '2026-09-13' }, '2026-09-13'), '2026-10-10');
});

test('end date includes its day but prohibits later occurrences', () => {
  assert.equal(advance({ ...plan, endAt: '2026-10-10' }, '2026-09-10'), '2026-10-10');
  assert.equal(advance({ ...plan, endAt: '2026-10-09' }, '2026-09-10'), null);
});

test('Vietnam day calculations do not count hours as extra days', () => {
  assert.equal(maintenanceDay('2026-09-09T17:00:00Z'), '2026-09-10');
  assert.equal(maintenanceDay('2026-09-10'), '2026-09-10');
  assert.equal(maintenanceDaysBetween('2026-09-10T07:00:00', '2026-09-10'), 0);
  assert.equal(maintenanceDaysBetween('2026-09-09', '2026-09-10'), -1);
  assert.equal(maintenanceDaysBetween('2026-10-10', '2026-09-10'), 30);
});

test('invalid dates, fractional intervals and invalid configured weekdays are rejected', () => {
  assert.throws(() => maintenanceDay('2026-02-30'));
  for (const interval of [0, -1, 0.5, NaN, Infinity]) assert.throws(() => next('2026-09-10', interval, 'day'));
  assert.throws(() => next('2026-09-10', 1, 'week', { scheduleType: 'specific_dates', specificDaysOfWeek: [7] }));
});

test('long-lived schedules do not stop at a fixed iteration limit', () => {
  assert.equal(next('2050-01-01', 1, 'day', null, false, '2000-01-01'), '2050-01-02');
});
