import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import DataPreview from '@/components/DataPreview';
import StepHeader from '@/steps/StepHeader';
import StepMapping from '@/steps/StepMapping';
import StepResults from '@/steps/StepResults';
import StepRules from '@/steps/StepRules';
import StepReview from '@/steps/StepReview';
import StepSheet from '@/steps/StepSheet';
import StepUpload from '@/steps/StepUpload';
import { calculateMetrics } from '@/calculations/metrics';
import { DEFAULT_FILTERS, DEFAULT_RULES, OPTIONAL_FIELDS, REQUIRED_FIELDS } from '@/common/constants';
import { getSheetRows, readWorkbook } from '@/excel/workbook';
import { detectHeaderRow } from '@/parsing/headerDetection';
import { formatMonthKey, normalizeDateInput } from '@/parsing/date';
import { mapRowsToObjects } from '@/parsing/rows';
import { suggestMapping } from '@/parsing/normalize';
import {
  addPreset,
  deletePreset,
  getPreset,
  loadFilters,
  loadMapping,
  loadPresets,
  loadRules,
  saveFilters,
  saveMapping,
  saveRules
} from '@/lib/storage';
import type { CalculationResult, FieldMapping, FiltersConfig, Preset, RulesConfig, WorkbookInfo } from '@/types';

const emptyMapping: FieldMapping = {
  order_date: null,
  shipping_date: null,
  required_arrival_date: null,
  status: null,
  method: null,
  product: null,
  destination_country: null,
  order_id: null,
  customer: null
};

function makeSignature(payload: unknown) {
  try {
    return JSON.stringify(payload);
  } catch {
    return String(Date.now());
  }
}

export default function App() {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [workbookInfo, setWorkbookInfo] = useState<WorkbookInfo | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [sheetRows, setSheetRows] = useState<unknown[][]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [mapping, setMapping] = useState<FieldMapping>(emptyMapping);
  const [rules, setRules] = useState<RulesConfig>(DEFAULT_RULES);
  const [filters, setFilters] = useState<FiltersConfig>(DEFAULT_FILTERS);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [lastRunSignature, setLastRunSignature] = useState<string | null>(null);
  const [hasSavedFilters, setHasSavedFilters] = useState<boolean | null>(null);
  const autoAppliedFilters = useRef(false);
  const [pendingScroll, setPendingScroll] = useState<
    null | 'sheet' | 'header' | 'mapping' | 'rules' | 'review'
  >(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const mappingRef = useRef<HTMLDivElement | null>(null);
  const rulesRef = useRef<HTMLDivElement | null>(null);
  const reviewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedMapping = loadMapping();
    if (storedMapping) setMapping({ ...emptyMapping, ...storedMapping });
    const storedRules = loadRules();
    if (storedRules) setRules(storedRules);
    const storedFilters = loadFilters();
    if (storedFilters) {
      setFilters(storedFilters);
      setHasSavedFilters(true);
    } else {
      setHasSavedFilters(false);
    }
    setPresets(loadPresets());
  }, []);

  useEffect(() => {
    saveMapping(mapping);
  }, [mapping]);

  useEffect(() => {
    saveRules(rules);
  }, [rules]);

  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (!workbook || !selectedSheet) return;
    const rows = getSheetRows(workbook, selectedSheet);
    setSheetRows(rows);
    const detected = detectHeaderRow(rows);
    setHeaderRowIndex(detected.rowIndex);
  }, [workbook, selectedSheet]);

  const parsed = useMemo(() => {
    if (!sheetRows.length) return null;
    return mapRowsToObjects(sheetRows, headerRowIndex);
  }, [sheetRows, headerRowIndex]);

  useEffect(() => {
    if (!parsed?.headers?.length) return;
    const suggestions = suggestMapping(parsed.headers);
    setMapping((prev) => {
      const next = { ...prev };
      Object.entries(suggestions).forEach(([key, value]) => {
        const current = (next as any)[key] as string | null | undefined;
        if (!current || !parsed.headers.includes(current)) {
          (next as any)[key] = value;
        }
      });
      return next;
    });
  }, [parsed?.headers]);

  const missingRequired = useMemo(() => {
    const headers = parsed?.headers ?? [];
    return REQUIRED_FIELDS.filter((field) => {
      const col = mapping[field.key];
      return !(col && headers.includes(col));
    });
  }, [mapping, parsed]);

  const requiredMapped = missingRequired.length === 0;

  const availableMethods = useMemo(() => {
    if (!parsed || !mapping.method) return [] as string[];
    return Array.from(
      new Set(parsed.rows.map((row) => String(row.raw[mapping.method!] ?? '').trim()).filter(Boolean))
    ).sort();
  }, [parsed, mapping.method]);

  const availableProducts = useMemo(() => {
    if (!parsed || !mapping.product) return [] as string[];
    return Array.from(
      new Set(parsed.rows.map((row) => String(row.raw[mapping.product!] ?? '').trim()).filter(Boolean))
    ).sort();
  }, [parsed, mapping.product]);

  const availableMonths = useMemo(() => {
    if (!parsed || !mapping.shipping_date) return [] as string[];
    const months = parsed.rows
      .map((row) => normalizeDateInput(row.raw[mapping.shipping_date!] ?? null))
      .map((date) => formatMonthKey(date))
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(months)).sort();
  }, [parsed, mapping.shipping_date]);

  useEffect(() => {
    if (hasSavedFilters !== false) return;
    if (autoAppliedFilters.current) return;
    if (!parsed) return;
    const estoniaMethods = availableMethods.filter((method) =>
      method.toLowerCase().includes('estonia')
    );
    setFilters((prev) => ({
      ...prev,
      methods: estoniaMethods,
      deliveryNotRequired: true
    }));
    autoAppliedFilters.current = true;
  }, [availableMethods, hasSavedFilters, parsed]);

  const currentSignature = useMemo(() => {
    return makeSignature({ selectedSheet, headerRowIndex, mapping, rules, filters });
  }, [selectedSheet, headerRowIndex, mapping, rules, filters]);

  const resultsDirty = Boolean(calculation && lastRunSignature && lastRunSignature !== currentSignature);

  const handleFile = async (file: File) => {
    const wb = await readWorkbook(file);
    setWorkbook(wb);
    setWorkbookInfo({ name: file.name, size: file.size, sheetNames: wb.SheetNames });
    const feed = wb.SheetNames.find((name) => name.toLowerCase() === 'feed');
    setSelectedSheet(feed ?? wb.SheetNames[0] ?? null);
    setCalculation(null);
    setLastRunSignature(null);
    setShowAdvanced(false);
  };

  const handleClear = () => {
    setWorkbook(null);
    setWorkbookInfo(null);
    setSelectedSheet(null);
    setSheetRows([]);
    setHeaderRowIndex(0);
    setMapping(emptyMapping);
    setRules(DEFAULT_RULES);
    setFilters(DEFAULT_FILTERS);
    setCalculation(null);
    setLastRunSignature(null);
    setShowAdvanced(false);
  };

  const handleAutoMatch = () => {
    const headers = parsed?.headers ?? [];
    if (!headers.length) return;
    const suggestions = suggestMapping(headers);
    setMapping((prev) => {
      const next = { ...prev };
      Object.entries(suggestions).forEach(([key, value]) => {
        const current = (next as any)[key] as string | null | undefined;
        if (!current || !headers.includes(current)) {
          (next as any)[key] = value;
        }
      });
      return next;
    });
  };

  const handleSavePreset = (name: string) => {
    addPreset(name, mapping, rules, filters);
    setPresets(loadPresets());
  };

  const handleLoadPreset = (id: string) => {
    const preset = getPreset(id);
    if (!preset) return;
    setMapping({ ...emptyMapping, ...preset.mapping });
    setRules(preset.rules);
    setFilters(preset.filters);
  };

  const handleDeletePreset = (id: string) => {
    deletePreset(id);
    setPresets(loadPresets());
  };

  const canRun = Boolean(parsed?.rows?.length && requiredMapped);

  const handleCalculate = useCallback(() => {
    if (!parsed || !requiredMapped) return;
    const rawRows = parsed.rows.map((entry) => entry.raw);
    const result = calculateMetrics(rawRows, mapping, rules, filters);
    setCalculation(result);
    setLastRunSignature(currentSignature);
  }, [parsed, requiredMapped, mapping, rules, filters, currentSignature]);

  const readyToRun = Boolean(workbook && selectedSheet && parsed?.headers?.length && requiredMapped);

  useEffect(() => {
    if (!readyToRun) return;
    if (lastRunSignature === currentSignature) return;
    handleCalculate();
  }, [readyToRun, lastRunSignature, currentSignature, handleCalculate]);

  useEffect(() => {
    if (!showAdvanced || !pendingScroll) return;
    const target =
      pendingScroll === 'sheet'
        ? sheetRef.current
        : pendingScroll === 'header'
          ? headerRef.current
          : pendingScroll === 'mapping'
            ? mappingRef.current
            : pendingScroll === 'rules'
              ? rulesRef.current
              : reviewRef.current;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPendingScroll(null);
  }, [showAdvanced, pendingScroll]);

  const previewHighlights = useMemo(() => {
    const headers = parsed?.headers ?? [];
    const candidates = [
      mapping.order_date,
      mapping.shipping_date,
      mapping.required_arrival_date,
      mapping.status,
      mapping.method,
      mapping.product,
      mapping.destination_country,
      mapping.order_id,
      mapping.customer
    ].filter((v): v is string => Boolean(v));
    return candidates.filter((c) => headers.includes(c));
  }, [parsed, mapping]);

  const handleNavigate = (stepIndex: number) => {
    setShowAdvanced(true);
    const nextTarget =
      stepIndex === 1
        ? 'sheet'
        : stepIndex === 2
          ? 'header'
          : stepIndex === 3
            ? 'mapping'
            : stepIndex === 4
              ? 'rules'
              : stepIndex === 5
                ? 'review'
                : null;
    if (nextTarget) setPendingScroll(nextTarget);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Turnover &amp; SLA Dashboard</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Guided workflow for parsing Excel workbooks into SLA metrics, with quality checks and export-ready outputs.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-secondary/70">Static site ready</Badge>
              <Badge className="bg-secondary/70">React + TypeScript</Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold">Quick Run</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Upload a workbook and we’ll auto-run as soon as the required mappings are satisfied.
            </p>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="font-semibold">Upload</span>
                <span className={workbookInfo ? 'text-primary' : 'text-muted-foreground'}>
                  {workbookInfo ? 'Ready' : 'Waiting'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span className="font-semibold">Results</span>
                <span className={calculation ? 'text-primary' : 'text-muted-foreground'}>
                  {calculation ? 'Generated' : canRun ? 'Auto-running' : 'Waiting'}
                </span>
              </div>
              {missingRequired.length ? (
                <p className="text-muted-foreground">
                  {missingRequired.length} required field{missingRequired.length === 1 ? '' : 's'} still need mapping.
                </p>
              ) : null}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={() => setShowAdvanced((prev) => !prev)}
            >
              {showAdvanced ? 'Hide Settings' : 'Show Settings'}
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Dataset</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {workbookInfo ? 'Loaded workbook' : 'No file selected'}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleClear}>
                Reset
              </Button>
            </div>
            {workbookInfo ? (
              <div className="mt-3 space-y-1 text-xs">
                <p className="font-semibold">{workbookInfo.name}</p>
                <p className="text-muted-foreground">{(workbookInfo.size / 1024).toFixed(1)} KB · {workbookInfo.sheetNames.length} sheets</p>
                {selectedSheet ? (
                  <p className="text-muted-foreground">Current sheet: <span className="font-semibold text-foreground">{selectedSheet}</span></p>
                ) : null}
              </div>
            ) : null}
          </div>
        </aside>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Quick Run</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload a workbook to generate KPI results automatically once the required fields are mapped.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <StepUpload workbookInfo={workbookInfo} onFile={handleFile} onClear={handleClear} />

              {resultsDirty ? (
                <Alert>
                  <AlertTitle>Settings changed</AlertTitle>
                  <AlertDescription>
                    The mapping, rules, or filters changed since the last run. Results will auto-refresh once ready.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">Results</p>
                  <p className="text-xs text-muted-foreground">
                    {canRun ? 'Auto-run is enabled.' : 'Complete mapping to auto-run.'}
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={handleCalculate} disabled={!canRun}>
                  {calculation ? 'Re-run now' : 'Run now'}
                </Button>
              </div>

              <StepResults calculation={calculation} onNavigate={handleNavigate} />
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <div>
                <CardTitle>Settings &amp; Advanced</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fine-tune the sheet, header, mappings, and filters. Hidden by default.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAdvanced((prev) => !prev)}>
                {showAdvanced ? 'Collapse' : 'Expand'}
              </Button>
            </CardHeader>
            {showAdvanced ? (
              <CardContent className="space-y-6">
                <div ref={sheetRef} className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold">Sheet selection</p>
                    <p className="text-xs text-muted-foreground">
                      Choose the worksheet that contains the raw feed to analyze.
                    </p>
                  </div>
                  <StepSheet
                    sheetNames={workbookInfo?.sheetNames ?? []}
                    selectedSheet={selectedSheet}
                    onSelectSheet={(sheet) => {
                      setSelectedSheet(sheet);
                      setCalculation(null);
                      setLastRunSignature(null);
                    }}
                  />
                  <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
                    Tip: if your file contains multiple exports, pick the one that has the full order feed.
                  </div>
                </div>

                <Separator />

                <div ref={headerRef} className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold">Header row</p>
                    <p className="text-xs text-muted-foreground">
                      Confirm which row contains column names so mapping works correctly.
                    </p>
                  </div>
                  <StepHeader
                    headerRowIndex={headerRowIndex}
                    rows={sheetRows}
                    onChangeHeaderRowIndex={(index) => {
                      setHeaderRowIndex(index);
                      setCalculation(null);
                      setLastRunSignature(null);
                    }}
                  />
                </div>

                <Separator />

                <div ref={mappingRef} className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold">Field mapping</p>
                    <p className="text-xs text-muted-foreground">
                      Map required business fields to columns before results can auto-run.
                    </p>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    <div>
                      <StepMapping
                        headers={parsed?.headers ?? []}
                        rows={parsed?.rows ?? []}
                        mapping={mapping}
                        onChange={(next) => {
                          setMapping(next);
                          setCalculation(null);
                          setLastRunSignature(null);
                        }}
                        requiredFields={REQUIRED_FIELDS}
                        optionalFields={OPTIONAL_FIELDS}
                        onAutoMatch={handleAutoMatch}
                        onJumpToHeader={() => handleNavigate(2)}
                      />
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4">
                      <DataPreview
                        headers={parsed?.headers ?? []}
                        rows={parsed?.rows ?? []}
                        highlightedHeaders={previewHighlights}
                        caption="Preview (mapped columns highlighted)"
                      />
                    </div>
                  </div>
                  {missingRequired.length ? (
                    <Alert>
                      <AlertTitle>Mapping is required to run</AlertTitle>
                      <AlertDescription>
                        Map all required fields to unlock auto-run results.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>

                <Separator />

                <div ref={rulesRef} className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold">Rules &amp; filters</p>
                    <p className="text-xs text-muted-foreground">
                      Adjust shipped status matching and filter the dataset before calculating metrics.
                    </p>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                    <div>
                      <StepRules
                        rules={rules}
                        filters={filters}
                        onChangeRules={(next) => {
                          setRules(next);
                          setCalculation(null);
                          setLastRunSignature(null);
                        }}
                        onChangeFilters={(next) => {
                          setFilters(next);
                          setCalculation(null);
                          setLastRunSignature(null);
                        }}
                        availableMethods={availableMethods}
                        availableProducts={availableProducts}
                        availableMonths={availableMonths}
                      />
                    </div>
                    <div className="rounded-lg border border-border bg-card p-4">
                      <DataPreview
                        headers={parsed?.headers ?? []}
                        rows={parsed?.rows ?? []}
                        highlightedHeaders={previewHighlights}
                        caption="Preview"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div ref={reviewRef} className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold">Review &amp; presets</p>
                    <p className="text-xs text-muted-foreground">
                      Save reusable presets or validate the run summary before sharing results.
                    </p>
                  </div>
                  <StepReview
                    workbookName={workbookInfo?.name ?? null}
                    selectedSheet={selectedSheet}
                    headerRowIndex={headerRowIndex}
                    totalRows={parsed?.rows?.length ?? 0}
                    headers={parsed?.headers ?? []}
                    mapping={mapping}
                    rules={rules}
                    filters={filters}
                    requiredFields={REQUIRED_FIELDS}
                    presets={presets}
                    canRun={canRun}
                    onSavePreset={handleSavePreset}
                    onLoadPreset={handleLoadPreset}
                    onDeletePreset={handleDeletePreset}
                    onNavigate={handleNavigate}
                  />
                </div>
              </CardContent>
            ) : null}
          </Card>
        </section>
      </main>
    </div>
  );
}
