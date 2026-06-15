/**
 * Test script để verify logic calculateNextDueDate sau khi fix
 * Run: node scratch/test_scheduler_fix.js
 */

process.env.TZ = 'Asia/Ho_Chi_Minh';

const { addDays } = require('date-fns');

// Copy hàm đã fix (plain JS version)
function calculateNextDueDate(currentDueDate, intervalValue, intervalUnit, scheduleConfig, isFirstCalculation = false) {
  let current = new Date(currentDueDate);
  current.setHours(0, 0, 0, 0);

  if (scheduleConfig?.scheduleType === 'specific_dates' && isFirstCalculation) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (current < today) {
      current = today;
    }
  }

  if (!scheduleConfig || scheduleConfig.scheduleType !== 'specific_dates') {
    const nextDate = new Date(current);
    if (!isFirstCalculation) {
      switch (intervalUnit) {
        case 'day': nextDate.setDate(nextDate.getDate() + intervalValue); break;
        case 'week': nextDate.setDate(nextDate.getDate() + intervalValue * 7); break;
        case 'month': nextDate.setMonth(nextDate.getMonth() + intervalValue); break;
        case 'year': nextDate.setFullYear(nextDate.getFullYear() + intervalValue); break;
      }
    }
    return nextDate;
  }

  if (intervalUnit === 'week') {
    const validDays = scheduleConfig.specificDaysOfWeek;
    if (!validDays || validDays.length === 0) return addDays(current, 7);

    const currentDayOfWeek = current.getDay();
    const sortedDays = [...validDays].sort((a, b) => a - b);

    // Helper: find weekday in same week (week starts on Sunday)
    const getWeekdayInSameWeek = (base, targetDay) => {
      const sundayOffset = -base.getDay();
      const sunday = addDays(base, sundayOffset);
      return addDays(sunday, targetDay);
    };

    if (isFirstCalculation) {
      for (const day of sortedDays) {
        if (day > currentDayOfWeek) {
          return getWeekdayInSameWeek(current, day);
        }
      }
      if (sortedDays.includes(currentDayOfWeek)) {
        return new Date(current);
      }
      const firstValidDay = sortedDays[0];
      const nextBase = addDays(current, intervalValue * 7);
      return getWeekdayInSameWeek(nextBase, firstValidDay);
    } else {
      for (const day of sortedDays) {
        if (day > currentDayOfWeek) {
          return getWeekdayInSameWeek(current, day);
        }
      }
      const firstValidDay = sortedDays[0];
      const nextBase = addDays(current, intervalValue * 7);
      return getWeekdayInSameWeek(nextBase, firstValidDay);
    }
  }

  return isFirstCalculation ? current : addDays(current, intervalValue);
}

// Test helpers
let passed = 0, failed = 0;
function test(name, actual, expected) {
  const actualStr = actual.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
  const expectedStr = expected.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
  const ok = actual.toDateString() === expected.toDateString();
  console.log(`${ok ? '✅' : '❌'} ${name}`);
  if (!ok) {
    console.log(`   Expected: ${expectedStr}`);
    console.log(`   Actual:   ${actualStr}`);
    failed++;
  } else {
    console.log(`   Result: ${actualStr}`);
    passed++;
  }
}

const conf = { scheduleType: 'specific_dates', specificDaysOfWeek: [3] }; // Thứ 4

console.log('\n=== Test case từ bug report ===');
// BT trước: 10/6/2026 (Thứ 4), kỳ tiếp phải là 17/6/2026 (Thứ 4)
const prevDue = new Date('2026-06-10T00:00:00+07:00'); // 10/6 Thứ 4
const expectedNext = new Date('2026-06-17T00:00:00+07:00'); // 17/6 Thứ 4
test('10/6 (Thứ 4) → next should be 17/6 (Thứ 4)', 
  calculateNextDueDate(prevDue, 1, 'week', conf, false), 
  expectedNext);

// Ngày hiện tại trong DB: 2026-06-20T17:00:00.000Z = 21/6 VN time (Chủ nhật = day 0)
const badDue = new Date('2026-06-20T17:00:00.000Z'); // 21/6 Chủ nhật (UTC+7)
test('21/6 (Chủ nhật - ngày sai trong DB) → next should be 25/6 (Thứ 4)', 
  calculateNextDueDate(badDue, 1, 'week', conf, false), 
  new Date('2026-06-25T00:00:00+07:00'));

console.log('\n=== Test case isFirstCalculation ===');
// Bắt đầu từ Thứ 4, chọn Thứ 4 → trả về chính ngày đó
const wed4 = new Date('2026-06-04T00:00:00+07:00'); // 4/6 Thứ 4
test('isFirstCalc: startFrom Thứ 4, chọn Thứ 4 → returns same day', 
  calculateNextDueDate(wed4, 1, 'week', conf, true), 
  wed4);

// Bắt đầu từ Thứ 2, chọn Thứ 4 → trả về Thứ 4 cùng tuần
const mon8 = new Date('2026-06-08T00:00:00+07:00'); // 8/6 Thứ 2
test('isFirstCalc: startFrom Thứ 2 (8/6), chọn Thứ 4 → 10/6', 
  calculateNextDueDate(mon8, 1, 'week', conf, true), 
  new Date('2026-06-10T00:00:00+07:00'));

// Bắt đầu từ Thứ 6, chọn Thứ 4 → trả về Thứ 4 tuần sau
const fri12 = new Date('2026-06-12T00:00:00+07:00'); // 12/6 Thứ 6
test('isFirstCalc: startFrom Thứ 6 (12/6), chọn Thứ 4 → 17/6 (tuần sau)', 
  calculateNextDueDate(fri12, 1, 'week', conf, true), 
  new Date('2026-06-17T00:00:00+07:00'));

// Bắt đầu từ Chủ nhật, chọn Thứ 4 → trả về Thứ 4 cùng tuần (sau Chủ nhật)
const sun15 = new Date('2026-06-15T00:00:00+07:00'); // 15/6 Chủ nhật
test('isFirstCalc: startFrom Chủ nhật (15/6), chọn Thứ 4 → 17/6', 
  calculateNextDueDate(sun15, 1, 'week', conf, true), 
  new Date('2026-06-17T00:00:00+07:00'));

console.log('\n=== Test case interval=2 weeks ===');
const conf2 = { scheduleType: 'specific_dates', specificDaysOfWeek: [3] };
const wed10 = new Date('2026-06-10T00:00:00+07:00'); // 10/6 Thứ 4
test('Thứ 4 10/6, interval=2 weeks → 24/6 (Thứ 4)', 
  calculateNextDueDate(wed10, 2, 'week', conf2, false), 
  new Date('2026-06-24T00:00:00+07:00'));

console.log('\n=== Test case UTC timestamp (bug scenario) ===');
// UTC timestamp như trong DB: 2026-06-20T17:00:00.000Z = VN 21/6 (Chủ nhật)
const utcStored = new Date('2026-06-20T17:00:00.000Z');
console.log('  UTC stored date getDay():', utcStored.getDay(), '(should be 0=Sunday in VN)');
console.log('  UTC stored date local:', utcStored.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));

console.log('\n=== Summary ===');
console.log(`✅ Passed: ${passed}, ❌ Failed: ${failed}`);
