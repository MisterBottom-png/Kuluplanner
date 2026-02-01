import { buildNormalizedHeaderMap, normalizeHeader } from './normalize';

export function extractHeaders(rows: unknown[][], headerRowIndex: number): string[] {
  const headerRow = rows[headerRowIndex] ?? [];
  return headerRow.map((cell) => String(cell ?? '').trim());
}

export function mapRowsToObjects(rows: unknown[][], headerRowIndex: number) {
  const headers = extractHeaders(rows, headerRowIndex);
  const normalizedMap = buildNormalizedHeaderMap(headers);
  const dataRows = rows.slice(headerRowIndex + 1);

  const objects = dataRows
    .map((row) => {
      const record: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        record[header] = row[idx] ?? '';
      });
      return {
        raw: record,
        normalized: Object.entries(record).reduce<Record<string, string>>((acc, [key, value]) => {
          acc[normalizeHeader(key)] = String(value ?? '').trim();
          return acc;
        }, {})
      };
    })
    .filter((entry) => Object.values(entry.raw).some((value) => String(value ?? '').trim() !== ''));

  return { headers, normalizedMap, rows: objects };
}
