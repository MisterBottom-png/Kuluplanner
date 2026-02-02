// Header-row detection ported from KPI.html.
//
// The KPI.html tool scans the first N rows and chooses the row with the best score,
// where score is:
// - +1 for each required token found (exact or partial match)
// - +bonus for how "header-like" the row is (more non-empty cells)

function normalizeHeaderCell(x: unknown): string {
  return String(x ?? '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function detectHeaderRow(rows: unknown[][], maxScan = 100) {
  const requiredTokens = [
    'order_date',
    'shipping_date',
    'required_date_of_arrival',
    'shipping_method',
    'current_status',
    'product',
    'country'
  ];

  let best = { rowIndex: 0, score: -Infinity };
  const scan = Math.min(rows.length, Math.max(0, maxScan));

  for (let i = 0; i < scan; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const norm = row.map(normalizeHeaderCell);
    if (!norm.some(Boolean)) continue;

    let score = 0;
    for (const t of requiredTokens) {
      if (norm.includes(t) || norm.some((x) => x.includes(t))) score += 1;
    }

    score += Math.min(5, norm.filter(Boolean).length / 10);

    if (score > best.score) best = { rowIndex: i, score };
  }

  const maxScore = requiredTokens.length + 5;
  const confidence = best.score > 0 ? Math.min(1, Math.max(0, best.score / maxScore)) : 0;

  return { rowIndex: best.rowIndex, confidence: Math.round(confidence * 100) / 100 };
}
