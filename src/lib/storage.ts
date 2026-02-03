import { DEFAULT_FILTERS } from '@/common/constants';
import type { FieldMapping, FiltersConfig, Preset, RulesConfig } from '@/types';

const MAPPING_KEY = 'kuluplanner_mapping';
const RULES_KEY = 'kuluplanner_rules';
const FILTERS_KEY = 'kuluplanner_filters';
const PRESETS_KEY = 'kuluplanner_presets';

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
    const parsed = JSON.parse(raw) as FiltersConfig;
    return {
      ...parsed,
      deliveryNotRequired:
        typeof parsed.deliveryNotRequired === 'boolean'
          ? parsed.deliveryNotRequired
          : DEFAULT_FILTERS.deliveryNotRequired
    };
  } catch {
    return null;
  }
}

export function saveFilters(filters: FiltersConfig) {
  localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function createId() {
  // Prefer crypto.randomUUID when available.
  const cryptoObj = (globalThis as any).crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `preset_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function loadPresets(): Preset[] {
  const parsed = safeParse<Preset[]>(localStorage.getItem(PRESETS_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

export function savePresets(presets: Preset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function addPreset(name: string, mapping: FieldMapping, rules: RulesConfig, filters: FiltersConfig): Preset {
  const preset: Preset = {
    id: createId(),
    name: name.trim() || 'Untitled preset',
    createdAt: new Date().toISOString(),
    mapping,
    rules,
    filters
  };
  const presets = loadPresets();
  savePresets([preset, ...presets]);
  return preset;
}

export function deletePreset(id: string) {
  const next = loadPresets().filter((p) => p.id !== id);
  savePresets(next);
}

export function getPreset(id: string): Preset | null {
  return loadPresets().find((p) => p.id === id) ?? null;
}
