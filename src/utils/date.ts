/**
 * Local Date Utilities for Personal Workspace
 * Guarantees zero timezone offset shifts across UTC/local conversions.
 */

export const formatLocalDate = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
};

export const formatChineseDate = (dateStr: string): string => {
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`;
};

export const formatChineseDateShort = (dateStr: string): string => {
  const d = parseLocalDate(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const today = formatLocalDate(new Date());
  const isToday = dateStr.slice(0, 10) === today;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${isToday ? '今天' : ''}`;
};

export const addDays = (dateStr: string, days: number): string => {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
};
