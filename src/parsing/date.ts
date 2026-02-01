import * as XLSX from 'xlsx';

const EXCEL_EPOCH = new Date(Date.UTC(1899, 11, 30));

export function excelSerialToUTCDate(value: number): Date | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const parsed = XLSX.SSF.parse_date_code(value);
  if (parsed) {
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  const days = Math.floor(value);
  const utcTime = EXCEL_EPOCH.getTime() + days * 86400000;
  return new Date(utcTime);
}

export function normalizeDateInput(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value === 'number') {
    return excelSerialToUTCDate(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const isoMatch = /^\d{4}-\d{2}-\d{2}/.test(trimmed);
    if (isoMatch) {
      const date = new Date(`${trimmed.slice(0, 10)}T00:00:00Z`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
    }
  }
  return null;
}

export function formatMonthKey(date: Date | null): string | null {
  if (!date) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
