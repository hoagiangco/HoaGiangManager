export type IntervalUnit = 'day' | 'week' | 'month' | 'year';
export interface ScheduleConfig {
  scheduleType: 'interval' | 'specific_dates';
  specificDays?: number[];
  specificDaysOfWeek?: number[];
}
const DAY = 86400000;

/** Date arithmetic uses UTC midnight to represent a Vietnamese calendar day. */
export function maintenanceDay(value: string | Date): string {
  let day: string;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:$|T.*$)/.test(value) &&
      !/[zZ]|[+-]\d{2}:?\d{2}$/.test(value.slice(10))) {
    day = value.slice(0, 10);
  } else {
    const instant = new Date(value);
    if (!Number.isFinite(instant.getTime())) throw new Error('Ngày bảo trì không hợp lệ');
    day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(instant);
  }
  const parsed = new Date(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) {
    throw new Error('Ngày bảo trì không hợp lệ');
  }
  return day;
}
export const maintenanceToday = () => maintenanceDay(new Date());
const utc = (day: string) => new Date(`${day}T00:00:00.000Z`);
const dayOf = (date: Date) => {
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() > 9999) throw new Error('Ngày bảo trì vượt phạm vi hỗ trợ');
  return date.toISOString().slice(0, 10);
};
export function maintenanceDaysBetween(due: string | Date, today: string | Date = maintenanceToday()): number {
  return (utc(maintenanceDay(due)).getTime() - utc(maintenanceDay(today)).getTime()) / DAY;
}
function monthDate(year: number, month: number, day: number): Date {
  const base = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(day, last));
  return base;
}
function selectedDays(values: number[] | undefined, min: number, max: number): number[] {
  if (!Array.isArray(values) || !values.length || values.some(v => !Number.isInteger(v) || v < min || v > max)) {
    throw new Error('Ngày lặp bảo trì không hợp lệ');
  }
  return Array.from(new Set(values)).sort((a, b) => a - b);
}
/** Every occurrence derives from StartFrom, never completion. First calculation is inclusive.
 * Week cycles start Sunday; annual schedules retain StartFrom's month.
 */
export function calculateNextDueDay(
  cutoff: string | Date, interval: number, unit: IntervalUnit, config?: ScheduleConfig | null,
  inclusive = false, startFrom?: string | Date | null,
): string {
  if (!Number.isSafeInteger(interval) || interval <= 0 || !['day', 'week', 'month', 'year'].includes(unit)) {
    throw new Error('Chu kỳ bảo trì phải là số nguyên dương với đơn vị hợp lệ');
  }
  const current = utc(maintenanceDay(cutoff));
  const anchor = utc(maintenanceDay(startFrom || cutoff));
  const threshold = Math.max(current.getTime() + (inclusive ? 0 : DAY), anchor.getTime());
  const target = new Date(threshold);
  const specific = config?.scheduleType === 'specific_dates';
  const weekdays = specific && unit === 'week' ? selectedDays(config.specificDaysOfWeek, 0, 6) : null;
  const dates = specific && (unit === 'month' || unit === 'year') ? selectedDays(config.specificDays, 1, 31) : null;
  if (!weekdays && !dates && (unit === 'day' || unit === 'week')) {
    const step = interval * (unit === 'week' ? 7 : 1) * DAY;
    return dayOf(new Date(anchor.getTime() + Math.max(0, Math.ceil((threshold - anchor.getTime()) / step)) * step));
  }
  const anchorMonth = anchor.getUTCFullYear() * 12 + anchor.getUTCMonth();
  const targetMonth = target.getUTCFullYear() * 12 + target.getUTCMonth();
  const monthStep = interval * (unit === 'year' ? 12 : 1);
  const weekStart = anchor.getTime() - anchor.getUTCDay() * DAY;
  let cycle = weekdays
    ? Math.max(0, Math.floor((threshold - weekStart) / (interval * 7 * DAY)))
    : Math.max(0, Math.floor((targetMonth - anchorMonth) / monthStep));
  for (let attempt = 0; attempt < 2; attempt++, cycle++) {
    const candidates = weekdays
      ? weekdays.map(d => new Date(weekStart + (cycle * interval * 7 + d) * DAY))
      : (dates || [anchor.getUTCDate()]).map(d =>
          monthDate(anchor.getUTCFullYear(), anchor.getUTCMonth() + cycle * monthStep, d));
    const match = candidates.find(date => date.getTime() >= threshold);
    if (match) return dayOf(match);
  }
  throw new Error('Không tính được ngày bảo trì tiếp theo');
}
/** Compatibility wrapper. Returned dates are UTC midnight. */
export const calculateNextDueDate = (
  current: Date, interval: number, unit: IntervalUnit, config?: ScheduleConfig | null,
  inclusive = false, startFrom?: Date | null,
): Date => utc(calculateNextDueDay(current, interval, unit, config, inclusive, startFrom));
export interface ScheduledPlan {
  startFrom?: string | Date | null;
  endAt?: string | Date | null;
  nextDueDate?: string | Date | null;
  intervalValue?: number | null;
  intervalUnit?: string | null;
  metadata?: { scheduleConfig?: ScheduleConfig | null } | null;
}
/** Independent of the entered completion date; repeated advancement on the same day is a no-op. */
export function advanceScheduledDueDay(plan: ScheduledPlan, asOf = maintenanceToday()): string | null {
  if (!plan.nextDueDate) return null;
  const due = maintenanceDay(plan.nextDueDate);
  const today = maintenanceDay(asOf);
  const next = due > today || !plan.intervalValue || !plan.intervalUnit ? due : calculateNextDueDay(
    today, plan.intervalValue, plan.intervalUnit as IntervalUnit, plan.metadata?.scheduleConfig,
    false, plan.startFrom || due,
  );
  return plan.endAt && next > maintenanceDay(plan.endAt) ? null : next;
}
