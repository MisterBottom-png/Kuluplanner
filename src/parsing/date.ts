import * as XLSX from 'xlsx';
import type { MonthBasis } from '@/types';

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

const EXCEL_SERIAL_RE = /^\d+(\.\d+)?$/;

export function parseDateSafe(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value === 'number') {
    return excelSerialToUTCDate(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.replace(/_x000D_/g, '').trim();
    if (!trimmed) return null;

    const isoMatch = /^\d{4}-\d{2}-\d{2}/.test(trimmed);
    if (isoMatch) {
      const date = new Date(`${trimmed.slice(0, 10)}T00:00:00Z`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (EXCEL_SERIAL_RE.test(trimmed)) {
      return excelSerialToUTCDate(Number(trimmed));
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
    }
  }
  return null;
}

export function normalizeDateInput(value: unknown): Date | null {
  return parseDateSafe(value);
}

export function getAxisDate(
  monthBasis: MonthBasis,
  dates: {
    orderDate: Date | null;
    shippingDate: Date | null;
    requiredArrivalDate: Date | null;
  }
): Date | null {
  const { orderDate, shippingDate, requiredArrivalDate } = dates;
  if (monthBasis === 'shipped') {
    return shippingDate ?? requiredArrivalDate ?? orderDate ?? null;
  }
  if (monthBasis === 'sla_due') {
    return requiredArrivalDate ?? shippingDate ?? orderDate ?? null;
  }
  return orderDate ?? shippingDate ?? requiredArrivalDate ?? null;
}

export function formatMonthKey(date: Date | null): string | null {
  if (!date) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
