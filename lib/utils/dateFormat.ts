import { format } from 'date-fns';

/**
 * Format date for display: dd/MM/yyyy
 */
export const formatDateDisplay = (value?: string | Date | null): string => {
  if (!value) return '';
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '';
    return format(date, 'dd/MM/yyyy');
  } catch (error) {
    return '';
  }
};

/**
 * Format date for input: yyyy-MM-dd (HTML5 date input format)
 */
export const formatDateInput = (value?: string | Date | null): string => {
  if (!value) return '';
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '';
    return format(date, 'yyyy-MM-dd');
  } catch (error) {
    return '';
  }
};

/**
 * Format date with time: dd/MM/yyyy HH:mm
 */
export const formatDateTime = (value?: string | Date | null): string => {
  if (!value) return '';
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '';
    return format(date, 'dd/MM/yyyy HH:mm');
  } catch (error) {
    return '';
  }
};

/**
 * Format date for filename: yyyyMMdd (no separator)
 */
export const formatDateFilename = (value?: string | Date | null): string => {
  if (!value) return '';
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '';
    return format(date, 'yyyyMMdd');
  } catch (error) {
    return '';
  }
};

/**
 * Format date range: dd/MM/yyyy đến dd/MM/yyyy
 */
export const formatDateRange = (fromDate: Date | string, toDate: Date | string): string => {
  const from = formatDateDisplay(fromDate);
  const to = formatDateDisplay(toDate);
  return `${from} đến ${to}`;
};

