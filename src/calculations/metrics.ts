import { formatMonthKey, normalizeDateInput } from '@/parsing/date';
import type { CalculationResult, EnrichedRow, FieldMapping, FiltersConfig, MonthlySummary, RulesConfig } from '@/types';

const REQUIRED_FIELDS: Array<keyof FieldMapping> = [
  'order_date',
  'shipping_date',
  'required_arrival_date',
  'status',
  'method',
  'product',
  'destination_country'
];

function getEnrichedValue(row: EnrichedRow, field: keyof FieldMapping) {
  switch (field) {
    case 'order_date':
      return row.orderDate;
    case 'shipping_date':
      return row.shippingDate;
    case 'required_arrival_date':
      return row.requiredArrivalDate;
    case 'status':
      return row.status;
    case 'method':
      return row.method;
    case 'product':
      return row.product;
    case 'destination_country':
      return row.destinationCountry;
    case 'order_id':
      return row.orderId;
    case 'customer':
      return row.customer;
    default:
      return null;
  }
}

function getMappedValue(row: Record<string, unknown>, mapping: FieldMapping, key: string) {
  const column = mapping[key];
  if (!column) return '';
  return row[column] ?? '';
}

function matchStatus(status: string, rules: RulesConfig) {
  const normalized = status.toLowerCase();
  const listMatch = rules.statusMatchers.some((matcher) => normalized.includes(matcher.toLowerCase()));
  if (rules.statusRegex) {
    try {
      const regex = new RegExp(rules.statusRegex, 'i');
      return regex.test(status) || listMatch;
    } catch {
      return listMatch;
    }
  }
  return listMatch;
}

function daysBetween(start: Date, end: Date) {
  const diff = end.getTime() - start.getTime();
  return Math.round(diff / 86400000);
}

export function calculateMetrics(
  rawRows: Record<string, unknown>[],
  mapping: FieldMapping,
  rules: RulesConfig,
  filters: FiltersConfig
): CalculationResult {
  const exclusions = new Map<string, number>();
  const excludedRows: Array<{ row: EnrichedRow; reason: string }> = [];

  const trackExclusion = (reason: string) => {
    exclusions.set(reason, (exclusions.get(reason) ?? 0) + 1);
  };

  const enriched: EnrichedRow[] = rawRows.map((row) => {
    const orderDate = normalizeDateInput(getMappedValue(row, mapping, 'order_date'));
    const shippingDate = normalizeDateInput(getMappedValue(row, mapping, 'shipping_date'));
    const requiredArrivalDate = normalizeDateInput(
      getMappedValue(row, mapping, 'required_arrival_date')
    );

    const status = String(getMappedValue(row, mapping, 'status') ?? '').trim();
    const method = String(getMappedValue(row, mapping, 'method') ?? '').trim();
    const product = String(getMappedValue(row, mapping, 'product') ?? '').trim();
    const destinationCountry = String(getMappedValue(row, mapping, 'destination_country') ?? '').trim();
    const orderId = String(getMappedValue(row, mapping, 'order_id') ?? '').trim();
    const customer = String(getMappedValue(row, mapping, 'customer') ?? '').trim();

    const turnoverDays =
      orderDate && shippingDate ? Math.max(daysBetween(orderDate, shippingDate), 0) : null;
    const isOnTime =
      shippingDate && requiredArrivalDate ? shippingDate <= requiredArrivalDate : null;

    return {
      orderDate,
      shippingDate,
      requiredArrivalDate,
      status,
      method,
      product,
      destinationCountry,
      orderId: orderId || undefined,
      customer: customer || undefined,
      turnoverDays,
      isOnTime,
      monthKey: formatMonthKey(shippingDate)
    };
  });

  const validRows = enriched.filter((row) => {
    const missingRequired = REQUIRED_FIELDS.some((field) => {
      if (!mapping[field]) return true;
      const value = getEnrichedValue(row, field);
      return !value;
    });
    if (missingRequired) return false;

    const missingDates = !row.orderDate || !row.shippingDate || !row.requiredArrivalDate;
    if (missingDates) return false;

    return true;
  });

  const includedRows = enriched.filter((row) => {
    const missingRequired = REQUIRED_FIELDS.some((field) => {
      const column = mapping[field];
      if (!column) return true;
      const value = getEnrichedValue(row, field);
      return !value;
    });
    if (missingRequired) {
      trackExclusion('Missing required fields');
      excludedRows.push({ row, reason: 'Missing required fields' });
      return false;
    }

    if (!row.orderDate || !row.shippingDate || !row.requiredArrivalDate) {
      trackExclusion('Unparseable or missing dates');
      excludedRows.push({ row, reason: 'Unparseable or missing dates' });
      return false;
    }

    if (!matchStatus(row.status, rules)) {
      trackExclusion('Status mismatch');
      excludedRows.push({ row, reason: 'Status mismatch' });
      return false;
    }

    if (rules.excludeChina && row.destinationCountry.toLowerCase().includes('china')) {
      trackExclusion('Excluded country');
      excludedRows.push({ row, reason: 'Excluded country' });
      return false;
    }

    if (filters.methods.length && !filters.methods.includes(row.method)) {
      trackExclusion('Filtered out by method');
      excludedRows.push({ row, reason: 'Filtered out by method' });
      return false;
    }

    if (filters.products.length && !filters.products.includes(row.product)) {
      trackExclusion('Filtered out by product');
      excludedRows.push({ row, reason: 'Filtered out by product' });
      return false;
    }

    if (filters.monthRange[0] && row.monthKey && row.monthKey < filters.monthRange[0]) {
      trackExclusion('Filtered out by month');
      excludedRows.push({ row, reason: 'Filtered out by month' });
      return false;
    }

    if (filters.monthRange[1] && row.monthKey && row.monthKey > filters.monthRange[1]) {
      trackExclusion('Filtered out by month');
      excludedRows.push({ row, reason: 'Filtered out by month' });
      return false;
    }

    if (!row.monthKey) {
      trackExclusion('Missing shipping month');
      excludedRows.push({ row, reason: 'Missing shipping month' });
      return false;
    }

    return true;
  });

  const monthly = buildMonthlySummary(includedRows);

  return {
    monthly,
    rows: includedRows,
    quality: {
      rawRows: rawRows.length,
      validRows: validRows.length,
      includedRows: includedRows.length,
      exclusions: Array.from(exclusions.entries()).map(([reason, count]) => ({ reason, count }))
    },
    excludedRows
  };
}

function buildMonthlySummary(rows: EnrichedRow[]): MonthlySummary[] {
  const grouped = new Map<string, EnrichedRow[]>();
  rows.forEach((row) => {
    if (!row.monthKey) return;
    if (!grouped.has(row.monthKey)) grouped.set(row.monthKey, []);
    grouped.get(row.monthKey)?.push(row);
  });

  return Array.from(grouped.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, monthRows]) => {
      const shipped = monthRows.length;
      const onTime = monthRows.filter((row) => row.isOnTime).length;
      const late = monthRows.filter((row) => row.isOnTime === false).length;
      const turnoverValues = monthRows
        .map((row) => row.turnoverDays)
        .filter((value): value is number => typeof value === 'number');
      const averageTurnover = turnoverValues.length
        ? turnoverValues.reduce((acc, value) => acc + value, 0) / turnoverValues.length
        : null;
      return {
        month,
        shipped,
        onTime,
        late,
        onTimeRate: shipped ? onTime / shipped : 0,
        averageTurnover: averageTurnover !== null ? Number(averageTurnover.toFixed(1)) : null
      };
    });
}
