import { addDays, addMonths, addYears, setDate } from 'date-fns';

type IntervalUnit = 'day' | 'week' | 'month' | 'year';

export interface ScheduleConfig {
  scheduleType: 'interval' | 'specific_dates';
  specificDays?: number[]; // 1-31
  specificDaysOfWeek?: number[]; // 0-6 (0 = Sunday, 1 = Monday, ...)
}

export const calculateNextDueDate = (
  currentDueDate: Date,
  intervalValue: number,
  intervalUnit: IntervalUnit,
  scheduleConfig?: ScheduleConfig | null,
  isFirstCalculation: boolean = false
): Date => {
  let current = new Date(currentDueDate);
  current.setHours(0, 0, 0, 0);

  // If specific dates and first calculation, ensure we don't schedule in the past
  // by using today as the minimum base date.
  if (scheduleConfig?.scheduleType === 'specific_dates' && isFirstCalculation) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (current < today) {
      current = today;
    }
  }

  // Default to standard interval logic if no specific dates config
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

  // Logic for specific dates
  if (intervalUnit === 'week') {
    const validDays = scheduleConfig.specificDaysOfWeek;
    if (!validDays || validDays.length === 0) return addDays(current, 7); // Fallback

    const currentDayOfWeek = current.getDay();

    // Sort days to ensure they are in order
    const sortedDays = [...validDays].sort((a, b) => a - b);

    // Helper: given a base date and a target day-of-week, return the date of that
    // weekday within the same week (week starts on Sunday).
    const getWeekdayInSameWeek = (base: Date, targetDay: number): Date => {
      // Move back to Sunday (start of week)
      const sundayOffset = -base.getDay();
      const sunday = addDays(base, sundayOffset);
      return addDays(sunday, targetDay);
    };

    if (isFirstCalculation) {
      // Find the first valid weekday in the current week that is strictly > current
      // (or == current only if it falls exactly on that weekday, we still want next occurrence)
      for (const day of sortedDays) {
        if (day > currentDayOfWeek) {
          return getWeekdayInSameWeek(current, day);
        }
      }
      // If current day itself is a valid day (day === currentDayOfWeek),
      // return current as the first occurrence (schedule starts today).
      if (sortedDays.includes(currentDayOfWeek)) {
        return new Date(current);
      }
      // No valid day remaining this week — jump to first valid day next interval
      const firstValidDay = sortedDays[0];
      const nextBase = addDays(current, intervalValue * 7);
      return getWeekdayInSameWeek(nextBase, firstValidDay);
    } else {
      // Not first calculation: next occurrence must be strictly AFTER current.
      // First check same week for any remaining valid days.
      for (const day of sortedDays) {
        if (day > currentDayOfWeek) {
          return getWeekdayInSameWeek(current, day);
        }
      }
      // No valid day left this week — advance by intervalValue weeks and take first valid day.
      const firstValidDay = sortedDays[0];
      const nextBase = addDays(current, intervalValue * 7);
      return getWeekdayInSameWeek(nextBase, firstValidDay);
    }
  } 
  
  else if (intervalUnit === 'month' || intervalUnit === 'year') {
    const validDates = scheduleConfig.specificDays;
    if (!validDates || validDates.length === 0) {
       // fallback
       return intervalUnit === 'month' ? addMonths(current, intervalValue) : addYears(current, intervalValue);
    }

    const currentDateNum = current.getDate();
    const sortedDates = [...validDates].sort((a, b) => a - b);
    
    // Helper to get max days in month to handle end of month correctly
    const clampDate = (dateObj: Date, dayToSet: number) => {
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth();
      const maxDaysInMonth = new Date(year, month + 1, 0).getDate();
      return setDate(dateObj, Math.min(dayToSet, maxDaysInMonth));
    };

    if (isFirstCalculation) {
      // Find the first valid date in the current month >= today
      for (const day of sortedDates) {
        if (day >= currentDateNum) {
           return clampDate(current, day);
        }
      }
      // If none found in current month, jump to the next interval
      let nextBase = intervalUnit === 'month' ? addMonths(current, intervalValue) : addYears(current, intervalValue);
      return clampDate(nextBase, sortedDates[0]);
    } else {
      // Not first calculation: find next date > today in the same month
      for (const day of sortedDates) {
         if (day > currentDateNum) {
            return clampDate(current, day);
         }
      }
      // Jump to the next interval
      let nextBase = intervalUnit === 'month' ? addMonths(current, intervalValue) : addYears(current, intervalValue);
      return clampDate(nextBase, sortedDates[0]);
    }
  }

  // Fallback for days unit with specific dates
  return isFirstCalculation ? current : addDays(current, intervalValue);
};
