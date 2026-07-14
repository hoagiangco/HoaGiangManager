import { calculateNextDueDate } from './test_scheduler.ts';

const current = new Date('2026-07-14');
const config = { scheduleType: 'specific_dates', specificDays: [25] };
const res = calculateNextDueDate(current, 1, 'month', config as any, true);
console.log("Input:", current.toISOString(), "Local:", current.toString());
console.log("Output:", res.toISOString(), "Local:", res.toString());
