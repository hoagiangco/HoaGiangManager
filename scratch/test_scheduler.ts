import { addDays, addWeeks, addMonths, addYears, setDate, isAfter, isSameDay } from 'date-fns';

type IntervalUnit = 'day' | 'week' | 'month' | 'year';

interface ScheduleConfig {
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
  const current = new Date(currentDueDate);
  current.setHours(0, 0, 0, 0);

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
    
    if (isFirstCalculation) {
      // Find the first valid day in the current week that is >= today
      for (const day of sortedDays) {
        if (day >= currentDayOfWeek) {
          const diff = day - currentDayOfWeek;
          const candidate = addDays(current, diff);
          return candidate;
        }
      }
      // If none found this week, go to the next valid week
      const firstValidDay = sortedDays[0];
      let nextBase = addDays(current, intervalValue * 7);
      const nextBaseDayOfWeek = nextBase.getDay();
      const diff = firstValidDay - nextBaseDayOfWeek;
      return addDays(nextBase, diff);
    } else {
      // Not first calculation: find the next valid day in the current week AFTER today
      for (const day of sortedDays) {
        if (day > currentDayOfWeek) {
          const diff = day - currentDayOfWeek;
          return addDays(current, diff);
        }
      }
      // If none found, add interval weeks and pick the first valid day
      const firstValidDay = sortedDays[0];
      let nextBase = addDays(current, intervalValue * 7);
      const nextBaseDayOfWeek = nextBase.getDay();
      const diff = firstValidDay - nextBaseDayOfWeek;
      return addDays(nextBase, diff);
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

  // Fallback for days unit with specific dates (doesn't make sense, but handle gracefully)
  return isFirstCalculation ? current : addDays(current, intervalValue);
};

// Test cases
const test = () => {
  console.log("=== TESTS ===");
  // Test 1: Every 2 weeks on Mon (1), Wed (3), Fri (5)
  // Today is Tue, Jan 6, 2026. (Tue = 2)
  const today = new Date('2026-01-06T00:00:00Z');
  const conf1: ScheduleConfig = { scheduleType: 'specific_dates', specificDaysOfWeek: [1, 3, 5] };
  
  const first = calculateNextDueDate(today, 2, 'week', conf1, true);
  console.log("First date (expected Jan 7 / Wed):", first.toISOString()); // Should be Jan 7 (Wed)

  const second = calculateNextDueDate(first, 2, 'week', conf1, false);
  console.log("Second date (expected Jan 9 / Fri):", second.toISOString()); // Should be Jan 9 (Fri)

  const third = calculateNextDueDate(second, 2, 'week', conf1, false);
  console.log("Third date (expected Jan 19 / Mon - jumping 2 weeks from Jan 6 week? Wait!)", third.toISOString()); 
  // Wait, if we are at Jan 9 (Fri) of Week 0, jumping 2 weeks means jumping to Jan 19? 
  // Let's trace: Jan 9 (Fri) -> Next base = Jan 9 + 14 days = Jan 23 (Fri). Diff to Mon = 1 - 5 = -4 -> Jan 19. Yes!
  
  // Month tests
  // Today Jan 5. Every 1 month on 1, 10, 20.
  const today2 = new Date('2026-01-05T00:00:00Z');
  const conf2: ScheduleConfig = { scheduleType: 'specific_dates', specificDays: [1, 10, 20] };
  const firstM = calculateNextDueDate(today2, 1, 'month', conf2, true);
  console.log("First month date (expected Jan 10):", firstM.toISOString());
  const secondM = calculateNextDueDate(firstM, 1, 'month', conf2, false);
  console.log("Second month date (expected Jan 20):", secondM.toISOString());
  const thirdM = calculateNextDueDate(secondM, 1, 'month', conf2, false);
  console.log("Third month date (expected Feb 1):", thirdM.toISOString());

  // Month clamp test
  // Every month on 31
  const today3 = new Date('2026-01-31T00:00:00Z');
  const conf3: ScheduleConfig = { scheduleType: 'specific_dates', specificDays: [31] };
  const firstClamp = calculateNextDueDate(today3, 1, 'month', conf3, false);
  console.log("Next month (Feb) clamp (expected Feb 28):", firstClamp.toISOString());
};

test();
