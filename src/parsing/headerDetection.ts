import { normalizeHeader } from './normalize';

export function detectHeaderRow(rows: unknown[][], maxScan = 20) {
  let best = { rowIndex: 0, confidence: 0 };

  rows.slice(0, maxScan).forEach((row, index) => {
    if (!Array.isArray(row)) return;
    const normalized = row
      .map((cell) => (typeof cell === 'string' ? normalizeHeader(cell) : ''))
      .filter(Boolean);
    const unique = new Set(normalized);
    if (unique.size === 0) return;
    const score = unique.size / Math.max(row.length, 1);
    if (score > best.confidence) {
      best = { rowIndex: index, confidence: Math.round(score * 100) / 100 };
    }
  });

  return best;
}
