import { format } from 'date-fns';

// Format date for display: dd/MM/yyyy
export const formatDateDisplay = (value?: string | Date | null): string => {
  if (!value) return '';
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
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
    // en-CA format is YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
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
    
    const datePart = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
    
    const timePart = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);

    return `${datePart} ${timePart}`;
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
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).formatToParts(date);
    
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    
    return `${year}${month}${day}`;
  } catch (error) {
    return '';
  }
};

/**
 * Format date range: dd/MM/yyyy đến dd/MM/yyyy
 */
export const formatDateRange = (fromDate?: Date | string | null, toDate?: Date | string | null): string => {
  if (!fromDate && !toDate) return 'tất cả thời gian';
  const from = formatDateDisplay(fromDate) || '...';
  const to = formatDateDisplay(toDate) || '...';
  return `${from} đến ${to}`;
};

