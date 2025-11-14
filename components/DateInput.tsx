'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { formatDateInput } from '@/lib/utils/dateFormat';

// Dynamically import DatePicker to avoid SSR issues
const DatePicker = dynamic(
  () => import('react-datepicker').then((mod) => mod.default || mod),
  { 
    ssr: false,
    loading: () => <input type="text" className="form-control" readOnly placeholder="dd/MM/yyyy" />
  }
);

interface DateInputProps {
  value?: string | Date | null;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  min?: string | Date;
  max?: string | Date;
  placeholder?: string;
  required?: boolean;
}

export default function DateInput({
  value,
  onChange,
  className = 'form-control',
  disabled = false,
  min,
  max,
  placeholder = 'dd/MM/yyyy',
  required = false,
}: DateInputProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [DatePickerComponent, setDatePickerComponent] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    // Register Vietnamese locale when component mounts
    Promise.all([
      import('react-datepicker'),
      import('date-fns/locale')
    ]).then(([datePickerMod, localeMod]) => {
      const { registerLocale } = datePickerMod;
      registerLocale('vi', localeMod.vi);
      setDatePickerComponent(() => datePickerMod.default || datePickerMod);
    });
  }, []);

  // Convert string value to Date object
  let dateValue: Date | null = null;
  if (value) {
    if (typeof value === 'string') {
      if (value.trim()) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          dateValue = parsed;
        }
      }
    } else if (value instanceof Date) {
      if (!isNaN(value.getTime())) {
        dateValue = value;
      }
    }
  }

  // Convert min/max to Date objects if they are strings
  let minDate: Date | undefined = undefined;
  if (min) {
    if (typeof min === 'string') {
      if (min.trim()) {
        const parsed = new Date(min);
        if (!isNaN(parsed.getTime())) {
          minDate = parsed;
        }
      }
    } else if (min instanceof Date) {
      if (!isNaN(min.getTime())) {
        minDate = min;
      }
    }
  }

  let maxDate: Date | undefined = undefined;
  if (max) {
    if (typeof max === 'string') {
      if (max.trim()) {
        const parsed = new Date(max);
        if (!isNaN(parsed.getTime())) {
          maxDate = parsed;
        }
      }
    } else if (max instanceof Date) {
      if (!isNaN(max.getTime())) {
        maxDate = max;
      }
    }
  }

  const handleChange = (date: Date | null) => {
    if (date && !isNaN(date.getTime())) {
      // Convert to yyyy-MM-dd format for form submission
      onChange(formatDateInput(date));
    } else {
      onChange('');
    }
  };

  if (!isMounted || !DatePickerComponent) {
    // Return a regular input during SSR or while loading
    return (
      <input
        type="text"
        className={className}
        value={dateValue ? formatDateInput(dateValue) : ''}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        readOnly
      />
    );
  }

  const Picker = DatePickerComponent;

  return (
    <Picker
      selected={dateValue}
      onChange={handleChange}
      dateFormat="dd/MM/yyyy"
      className={className}
      disabled={disabled}
      minDate={minDate}
      maxDate={maxDate}
      placeholderText={placeholder}
      required={required}
      showYearDropdown
      showMonthDropdown
      dropdownMode="select"
      locale="vi"
      wrapperClassName="w-100"
    />
  );
}

