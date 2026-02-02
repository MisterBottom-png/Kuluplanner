export function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

export function buildNormalizedHeaderMap(headers: string[]) {
  return headers.reduce<Record<string, string>>((acc, header) => {
    const normalized = normalizeHeader(header);
    if (normalized && !acc[normalized]) {
      acc[normalized] = header;
    }
    return acc;
  }, {});
}

// Mapping suggestion logic ported from KPI.html's getField() approach.
// The goal is to "just work" with Column1.* style headers and common variants,
// without requiring the user to manually map columns.

function pickHeader(headers: string[], needles: string[]): string | null {
  // Direct match
  for (const n of needles) {
    const direct = headers.find((h) => h === n);
    if (direct) return direct;
  }

  // Case-insensitive exact match
  for (const n of needles) {
    const nl = String(n).toLowerCase();
    const exact = headers.find((h) => String(h).toLowerCase() === nl);
    if (exact) return exact;
  }

  // Partial match (needle contained in header)
  for (const n of needles) {
    const nl = String(n).toLowerCase();
    const partial = headers.find((h) => String(h).toLowerCase().includes(nl));
    if (partial) return partial;
  }

  return null;
}

const FIELD_NEEDLES: Record<string, string[]> = {
  // Required
  order_date: ['Column1.order_date', 'order_date', 'order date', 'orderdate', 'order_dt'],
  shipping_date: ['Column1.shipping_date', 'shipping_date', 'shipping date', 'ship date', 'ship_dt'],
  // KPI.html uses required_date_of_arrival; keep both naming styles.
  required_arrival_date: [
    'Column1.required_date_of_arrival',
    'required_date_of_arrival',
    'required_arrival_date',
    'sla',
    'sla date'
  ],
  status: ['Column1.current_status', 'current_status', 'status', 'order status', 'shipment status'],
  method: ['Column1.shipping_method', 'shipping_method', 'shipping method', 'method', 'ship method'],
  product: ['Column1.product', 'product', 'sku', 'item'],
  destination_country: ['Column1.country', 'country', 'destination_country', 'ship country', 'destination'],

  // Optional
  order_id: ['Column1.order_id', 'order_id', 'order id', 'order number', 'order no', 'order_no'],
  customer: ['Column1.customer', 'customer', 'customer name', 'client']
};

export function suggestMapping(headers: string[]): Record<string, string | null> {
  const mapping: Record<string, string | null> = {};
  Object.entries(FIELD_NEEDLES).forEach(([field, needles]) => {
    mapping[field] = pickHeader(headers, needles);
  });
  return mapping;
}
