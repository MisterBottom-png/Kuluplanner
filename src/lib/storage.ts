import type { FieldMapping, FiltersConfig, RulesConfig } from '@/types';

const MAPPING_KEY = 'kuluplanner_mapping';
const RULES_KEY = 'kuluplanner_rules';
const FILTERS_KEY = 'kuluplanner_filters';

export function loadMapping(): FieldMapping | null {
  const raw = localStorage.getItem(MAPPING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FieldMapping;
  } catch {
    return null;
  }
}

export function saveMapping(mapping: FieldMapping) {
  localStorage.setItem(MAPPING_KEY, JSON.stringify(mapping));
}

export function loadRules(): RulesConfig | null {
  const raw = localStorage.getItem(RULES_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RulesConfig;
  } catch {
    return null;
  }
}

export function saveRules(rules: RulesConfig) {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

export function loadFilters(): FiltersConfig | null {
  const raw = localStorage.getItem(FILTERS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FiltersConfig;
  } catch {
    return null;
  }
}

export function saveFilters(filters: FiltersConfig) {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
}
