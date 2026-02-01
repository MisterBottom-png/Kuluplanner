import { excelSerialToUTCDate, formatMonthKey, normalizeDateInput } from '@/parsing/date';

describe('date parsing', () => {
  it('parses excel serials without timezone shifts', () => {
    const serial = 45382; // 2024-03-31
    const parsed = excelSerialToUTCDate(serial);
    expect(parsed?.toISOString().slice(0, 10)).toBe('2024-03-31');
  });

  it('parses ISO strings to UTC midnight', () => {
    const parsed = normalizeDateInput('2024-03-31');
    expect(parsed?.toISOString().slice(0, 10)).toBe('2024-03-31');
  });

  it('parses locale-ish strings consistently', () => {
    const parsed = normalizeDateInput('03/31/2024');
    expect(parsed?.toISOString().slice(0, 10)).toBe('2024-03-31');
  });

  it('formats month keys using UTC dates', () => {
    const date = normalizeDateInput('2024-10-15');
    expect(formatMonthKey(date)).toBe('2024-10');
  });
});
