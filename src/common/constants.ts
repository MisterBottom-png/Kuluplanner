import type { FieldKey, RequiredFieldKey } from '@/types';

export const REQUIRED_FIELDS: Array<{ key: RequiredFieldKey; label: string }> = [
  { key: 'order_date', label: 'Order date' },
  { key: 'shipping_date', label: 'Shipping date' },
  { key: 'required_arrival_date', label: 'Required arrival/SLA date' },
  { key: 'status', label: 'Status' },
  { key: 'method', label: 'Shipping method' },
  { key: 'product', label: 'Product' },
  { key: 'destination_country', label: 'Destination country' }
];

export const OPTIONAL_FIELDS: Array<{ key: FieldKey; label: string }> = [
  { key: 'order_id', label: 'Order ID' },
  { key: 'customer', label: 'Customer' }
];

export const DEFAULT_RULES = {
  excludeChina: true,
  statusMatchers: ['shipped', 'shipped out', 'delivered', 'sampling finished'],
  statusRegex: ''
};

export const DEFAULT_FILTERS = {
  methods: [],
  products: [],
  monthRange: [null, null] as [string | null, string | null],
  deliveryNotRequired: false
};
