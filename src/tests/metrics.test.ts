import { calculateMetrics } from '@/calculations/metrics';
import type { FieldMapping, FiltersConfig, RulesConfig } from '@/types';

describe('calculateMetrics', () => {
  const mapping: FieldMapping = {
    order_date: 'Order Date',
    shipping_date: 'Ship Date',
    required_arrival_date: 'Required Date',
    status: 'Status',
    method: 'Method',
    product: 'Product',
    destination_country: 'Country',
    order_id: null,
    customer: null
  };

  const rules: RulesConfig = {
    excludeChina: true,
    statusMatchers: ['shipped'],
    statusRegex: ''
  };

  const filters: FiltersConfig = {
    methods: [],
    products: [],
    monthRange: [null, null],
    deliveryNotRequired: true
  };

  it('computes on-time and late counts by month', () => {
    const rows = [
      {
        'Order Date': 45382,
        'Ship Date': 45384,
        'Required Date': 45385,
        Status: 'Shipped',
        Method: 'Air',
        Product: 'A',
        Country: 'Finland'
      },
      {
        'Order Date': 45382,
        'Ship Date': 45390,
        'Required Date': 45385,
        Status: 'Shipped',
        Method: 'Air',
        Product: 'A',
        Country: 'Finland'
      }
    ];

    const result = calculateMetrics(rows, mapping, rules, filters);
    expect(result.monthly).toHaveLength(1);
    expect(result.monthly[0].shipped).toBe(2);
    expect(result.monthly[0].onTime).toBe(1);
    expect(result.monthly[0].late).toBe(1);
  });

  it('tracks exclusions for status mismatch and country', () => {
    const rows = [
      {
        'Order Date': 45382,
        'Ship Date': 45384,
        'Required Date': 45385,
        Status: 'Pending',
        Method: 'Air',
        Product: 'A',
        Country: 'Finland'
      },
      {
        'Order Date': 45382,
        'Ship Date': 45384,
        'Required Date': 45385,
        Status: 'Shipped',
        Method: 'Air',
        Product: 'A',
        Country: 'China'
      }
    ];

    const result = calculateMetrics(rows, mapping, rules, filters);
    const reasons = result.quality.exclusions.map((item) => item.reason);
    expect(reasons).toContain('Status mismatch');
    expect(reasons).toContain('Excluded country');
    expect(result.rows).toHaveLength(0);
  });
});
