export type FieldKey =
  | 'order_date'
  | 'shipping_date'
  | 'required_arrival_date'
  | 'status'
  | 'method'
  | 'product'
  | 'destination_country'
  | 'order_id'
  | 'customer';

export type RequiredFieldKey =
  | 'order_date'
  | 'shipping_date'
  | 'required_arrival_date'
  | 'status'
  | 'method'
  | 'product'
  | 'destination_country';

export interface WorkbookInfo {
  name: string;
  size: number;
  sheetNames: string[];
}

export interface SheetPreview {
  rows: string[][];
}

export interface FieldMapping {
  [key: string]: string | null;
}

export interface HeaderCandidate {
  rowIndex: number;
  confidence: number;
}

export interface ParsedRow {
  raw: Record<string, unknown>;
  normalized: Record<string, string>;
}

export interface EnrichedRow {
  orderDate: Date | null;
  shippingDate: Date | null;
  requiredArrivalDate: Date | null;
  status: string;
  method: string;
  product: string;
  destinationCountry: string;
  orderId?: string;
  customer?: string;
  turnoverDays: number | null;
  isOnTime: boolean | null;
  monthKey: string | null;
}

export interface ExclusionReason {
  reason: string;
  count: number;
}

export interface QualityMetrics {
  rawRows: number;
  validRows: number;
  includedRows: number;
  exclusions: ExclusionReason[];
}

export interface MonthlySummary {
  month: string;
  shipped: number;
  onTime: number;
  late: number;
  onTimeRate: number;
  averageTurnover: number | null;
}

export interface CalculationResult {
  monthly: MonthlySummary[];
  rows: EnrichedRow[];
  quality: QualityMetrics;
  excludedRows: Array<{ row: EnrichedRow; reason: string }>;
}

export interface RulesConfig {
  excludeChina: boolean;
  statusMatchers: string[];
  statusRegex: string;
}

export interface FiltersConfig {
  methods: string[];
  products: string[];
  monthRange: [string | null, string | null];
}

export interface Preset {
  id: string;
  name: string;
  createdAt: string;
  mapping: FieldMapping;
  rules: RulesConfig;
  filters: FiltersConfig;
}
