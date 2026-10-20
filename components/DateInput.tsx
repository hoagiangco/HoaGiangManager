'use client';

import React, { useEffect, useState, forwardRef } from 'react';
import dynamic from 'next/dynamic';
import { formatDateInput, formatDateDisplay } from '@/lib/utils/dateFormat';

const noop = () => {};

// Dynamically import DatePicker with ssr: false
const DatePicker = dynamic<any>(
  () =>
    Promise.all([
      import('react-datepicker'),
      import('date-fns/locale')
    ])
      .then(([datePickerMod, localeMod]) => {
        const dp = datePickerMod.default || datePickerMod;
        const { registerLocale } = datePickerMod;
        if (registerLocale && localeMod.vi) {
          registerLocale('vi', localeMod.vi);
        }
        return dp;
      })
      .catch((err) => {
        console.warn('DatePicker dynamic import error, fallback to native input:', err);
        return () => null;
      }),
  { 
    ssr: false,
    loading: () => (
      <div className="position-relative w-100">
        <input type="text" className="form-control pe-4" readOnly placeholder="dd/MM/yyyy" />
        <i className="fas fa-calendar-alt position-absolute end-0 top-50 translate-middle-y me-2 text-muted" style={{ pointerEvents: 'none', fontSize: '0.85rem' }}></i>
      </div>
    )
  }
);

class DatePickerErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('DatePicker caught error, displaying fallback input:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface DateInputProps {
  value?: string | Date | null;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  min?: string | Date;
  max?: string | Date;
  placeholder?: string;
  required?: boolean;
  style?: React.CSSProperties;
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
  style,
}: DateInputProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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

  const formattedDateString = dateValue ? formatDateInput(dateValue) : '';
  const formattedDisplayString = dateValue ? formatDateDisplay(dateValue) : '';

  const nativeInputFallback = (
    <div className="position-relative w-100">
      <input
        type="date"
        className={`${className} pe-4`}
        value={formattedDateString}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        min={minDate ? formatDateInput(minDate) : undefined}
        max={maxDate ? formatDateInput(maxDate) : undefined}
        style={style}
      />
      <i className="fas fa-calendar-alt position-absolute end-0 top-50 translate-middle-y me-2 text-muted" style={{ pointerEvents: 'none', fontSize: '0.85rem' }}></i>
    </div>
  );

  if (!isMounted) {
    // Return a regular input during SSR
    return (
      <div className="position-relative w-100">
        <input
          type="text"
          className={`${className} pe-4`}
          value={formattedDisplayString}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={style}
          readOnly
        />
        <i className="fas fa-calendar-alt position-absolute end-0 top-50 translate-middle-y me-2 text-muted" style={{ pointerEvents: 'none', fontSize: '0.85rem' }}></i>
      </div>
    );
  }

  // Custom Input component that forwards refs and all events from DatePicker
  const CustomInput = forwardRef<HTMLInputElement, any>((inputProps, ref) => (
    <input
      ref={ref}
      {...inputProps}
      className={`${className} pe-4`}
      style={style ? { ...inputProps.style, ...style } : inputProps.style}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
    />
  ));
  CustomInput.displayName = 'CustomInput';

  return (
    <DatePickerErrorBoundary fallback={nativeInputFallback}>
      <div className="position-relative w-100">
        <DatePicker
          selected={dateValue}
          onChange={handleChange}
          onFocus={noop}
          onBlur={noop}
          onKeyDown={noop}
          onInputClick={noop}
          onClickOutside={noop}
          onSelect={noop}
          onCalendarOpen={noop}
          onCalendarClose={noop}
          onDropdownFocus={noop}
          onInputError={noop}
          onChangeRaw={noop}
          dateFormat="dd/MM/yyyy"
          className={`${className} pe-4`}
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
          portalId="root-portal"
          customInput={<CustomInput />}
        />
        <i className="fas fa-calendar-alt position-absolute end-0 top-50 translate-middle-y me-2 text-muted" style={{ pointerEvents: 'none', fontSize: '0.85rem' }}></i>
      </div>
    </DatePickerErrorBoundary>
  );
}
