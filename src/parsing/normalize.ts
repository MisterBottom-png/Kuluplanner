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

export const FIELD_SYNONYMS: Record<string, string[]> = {
  order_date: ['order date', 'order_date', 'orderdate', 'order_dt', 'order created'],
  shipping_date: ['ship date', 'shipping date', 'shipping_date', 'shipped date', 'ship_dt'],
  required_arrival_date: [
    'required arrival date',
    'required_arrival_date',
    'sla date',
    'sla target date',
    'delivery deadline'
  ],
  status: ['status', 'shipment status', 'order status'],
  method: ['method', 'shipping method', 'ship method', 'service level'],
  product: ['product', 'product group', 'sku', 'item', 'product_line'],
  destination_country: ['destination country', 'country', 'ship country', 'destination'],
  order_id: ['order id', 'order_id', 'order number', 'order no', 'order'],
  customer: ['customer', 'customer name', 'client']
};

export function suggestMapping(headers: string[]): Record<string, string | null> {
  const normalizedMap = buildNormalizedHeaderMap(headers);
  const mapping: Record<string, string | null> = {};

  Object.entries(FIELD_SYNONYMS).forEach(([field, synonyms]) => {
    const normalizedSynonyms = synonyms.map((syn) => normalizeHeader(syn));
    const match = normalizedSynonyms.find((syn) => normalizedMap[syn]);
    mapping[field] = match ? normalizedMap[match] : null;
  });

  return mapping;
}
