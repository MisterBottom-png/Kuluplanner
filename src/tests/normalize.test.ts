import { buildNormalizedHeaderMap, normalizeHeader, suggestMapping } from '@/parsing/normalize';

describe('normalizeHeader', () => {
  it('normalizes common variants', () => {
    expect(normalizeHeader('Order Date')).toBe('order_date');
    expect(normalizeHeader('order_date')).toBe('order_date');
    expect(normalizeHeader('Order-Date')).toBe('order_date');
    expect(normalizeHeader(' Order  Date ')).toBe('order_date');
  });

  it('builds normalized map with first occurrence', () => {
    const map = buildNormalizedHeaderMap(['Order Date', 'order_date']);
    expect(map.order_date).toBe('Order Date');
  });

  it('suggests mapping using synonyms', () => {
    const mapping = suggestMapping(['Shipping Date', 'Order Date', 'Status']);
    expect(mapping.shipping_date).toBe('Shipping Date');
    expect(mapping.order_date).toBe('Order Date');
    expect(mapping.status).toBe('Status');
  });
});
