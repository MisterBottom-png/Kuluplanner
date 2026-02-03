import { buildNormalizedHeaderMap, normalizeHeader } from './normalize';

export function normalizeCellValue(value: unknown): string {
  return String(value ?? '')
    .replace(/_x000D_/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractHeaders(rows: unknown[][], headerRowIndex: number): string[] {
  const headerRow = rows[headerRowIndex] ?? [];
  const rawHeaders = headerRow.map((cell) => String(cell ?? '').trim());
  const seen = new Map<string, number>();

  return rawHeaders.map((header) => {
    const base = header === '' ? '(empty)' : header;
    const count = seen.get(base) ?? 0;
    const nextCount = count + 1;
    seen.set(base, nextCount);

    if (nextCount === 1) {
      return base;
    }

    if (base === '(empty)') {
      return `(empty ${nextCount})`;
    }

    return `${base} (${nextCount})`;
  });
}

export function mapRowsToObjects(rows: unknown[][], headerRowIndex: number) {
  const headers = extractHeaders(rows, headerRowIndex);
  const normalizedMap = buildNormalizedHeaderMap(headers);
  const dataRows = rows.slice(headerRowIndex + 1);

  const objects = dataRows
    .map((row) => {
      const record: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        record[header] = normalizeCellValue(row[idx]);
      });
      return {
        raw: record,
        normalized: Object.entries(record).reduce<Record<string, string>>((acc, [key, value]) => {
          acc[normalizeHeader(key)] = normalizeCellValue(value);
          return acc;
        }, {})
      };
    })
    .filter((entry) => Object.values(entry.raw).some((value) => normalizeCellValue(value) !== ''));

  return { headers, normalizedMap, rows: objects };
}
