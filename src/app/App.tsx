import { useEffect, useMemo, useState } from 'react';
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

type StepId = 'upload' | 'sheet' | 'header' | 'mapping' | 'rules' | 'review' | 'results';

const WIZARD_STEPS: Array<{ id: StepId; title: string; subtitle: string }> = [
  { id: 'upload', title: 'Upload', subtitle: 'Choose an Excel workbook (.xlsx)' },
  { id: 'sheet', title: 'Sheet', subtitle: 'Pick the sheet that contains the raw feed' },
  { id: 'header', title: 'Header row', subtitle: 'Confirm which row contains column names' },
  { id: 'mapping', title: 'Field mapping', subtitle: 'Map required business fields to columns' },
  { id: 'rules', title: 'Rules & filters', subtitle: 'Define shipped statuses and optional filters' },
  { id: 'review', title: 'Review & run', subtitle: 'Save presets and run the analysis' },
  { id: 'results', title: 'Results', subtitle: 'KPI summary, trends, and exclusions' }
];

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
  const [activeStep, setActiveStep] = useState(0);
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

  useEffect(() => {
    const storedMapping = loadMapping();
    if (storedMapping) setMapping({ ...emptyMapping, ...storedMapping });
    const storedRules = loadRules();
    if (storedRules) setRules(storedRules);
    const storedFilters = loadFilters();
    if (storedFilters) setFilters(storedFilters);
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

  const currentSignature = useMemo(() => {
    return makeSignature({ selectedSheet, headerRowIndex, mapping, rules, filters });
  }, [selectedSheet, headerRowIndex, mapping, rules, filters]);

  const resultsDirty = Boolean(calculation && lastRunSignature && lastRunSignature !== currentSignature);

  const canAccessStep = (index: number) => {
    if (index <= activeStep) return true;
    switch (WIZARD_STEPS[index]?.id) {
      case 'sheet':
        return Boolean(workbook);
      case 'header':
        return Boolean(workbook && selectedSheet);
      case 'mapping':
        return Boolean(parsed?.headers?.length);
      case 'rules':
        return Boolean(parsed?.headers?.length && requiredMapped);
      case 'review':
        return Boolean(parsed?.headers?.length && requiredMapped);
      case 'results':
        return Boolean(calculation);
      default:
        return true;
    }
  };

  const handleFile = async (file: File) => {
    const wb = await readWorkbook(file);
    setWorkbook(wb);
    setWorkbookInfo({ name: file.name, size: file.size, sheetNames: wb.SheetNames });
    const feed = wb.SheetNames.find((name) => name.toLowerCase() === 'feed');
    setSelectedSheet(feed ?? wb.SheetNames[0] ?? null);
    setCalculation(null);
    setLastRunSignature(null);
    setActiveStep(1);
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
    setActiveStep(0);
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

  const handleCalculate = () => {
    if (!parsed || !requiredMapped) return;
    const rawRows = parsed.rows.map((entry) => entry.raw);
    const result = calculateMetrics(rawRows, mapping, rules, filters);
    setCalculation(result);
    setLastRunSignature(currentSignature);
    setActiveStep(6);
  };

  const stepTitle = WIZARD_STEPS[activeStep]?.title ?? 'Wizard';
  const stepSubtitle = WIZARD_STEPS[activeStep]?.subtitle ?? '';

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

  const footer = (
    <div className="sticky bottom-0 mt-6 border-t border-border bg-background/80 p-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
          disabled={activeStep === 0}
        >
          Back
        </Button>

        <div className="flex flex-wrap gap-2">
          {activeStep === 5 ? (
            <Button type="button" onClick={handleCalculate} disabled={!canRun}>
              Run analysis
            </Button>
          ) : activeStep === 6 ? (
            <>
              <Button type="button" variant="secondary" onClick={() => setActiveStep(5)}>
                Back to review
              </Button>
              <Button type="button" onClick={handleCalculate} disabled={!canRun}>
                Re-run analysis
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => setActiveStep((s) => Math.min(WIZARD_STEPS.length - 1, s + 1))}
              disabled={!canAccessStep(activeStep + 1)}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );

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
            <p className="text-sm font-semibold">Workflow</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Complete steps top to bottom. You can jump back at any time.
            </p>

            <div className="mt-4 space-y-2">
              {WIZARD_STEPS.map((step, index) => {
                const isCurrent = index === activeStep;
                const isReachable = canAccessStep(index);
                const isDone = index < activeStep && canAccessStep(index);
                const issues = step.id === 'mapping' ? missingRequired.length : 0;
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                      isCurrent
                        ? 'border-ring bg-muted/40'
                        : 'border-border hover:bg-muted/30'
                    } ${!isReachable ? 'opacity-50' : ''}`}
                    onClick={() => {
                      if (!isReachable) return;
                      setActiveStep(index);
                    }}
                    disabled={!isReachable}
                  >
                    <div
                      className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                        isCurrent ? 'border-ring' : isDone ? 'border-primary' : 'border-border'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{step.title}</span>
                        {issues ? (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                            {issues} missing
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{step.subtitle}</div>
                    </div>
                  </button>
                );
              })}
            </div>
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
              <CardTitle>{stepTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">{stepSubtitle}</p>
            </CardHeader>
            <CardContent>
              {activeStep === 0 ? (
                <StepUpload workbookInfo={workbookInfo} onFile={handleFile} onClear={handleClear} />
              ) : null}

              {activeStep === 1 ? (
                <div className="space-y-4">
                  <StepSheet
                    sheetNames={workbookInfo?.sheetNames ?? []}
                    selectedSheet={selectedSheet}
                    onSelectSheet={(sheet) => {
                      setSelectedSheet(sheet);
                      setCalculation(null);
                      setLastRunSignature(null);
                    }}
                  />
                  <Separator />
                  <div className="rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground">
                    Tip: if your file contains multiple exports, pick the one that has the full order feed.
                  </div>
                </div>
              ) : null}

              {activeStep === 2 ? (
                <StepHeader
                  headerRowIndex={headerRowIndex}
                  rows={sheetRows}
                  onChangeHeaderRowIndex={(index) => {
                    setHeaderRowIndex(index);
                    setCalculation(null);
                    setLastRunSignature(null);
                  }}
                />
              ) : null}

              {activeStep === 3 ? (
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
                      onJumpToHeader={() => setActiveStep(2)}
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
              ) : null}

              {activeStep === 4 ? (
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
              ) : null}

              {activeStep === 5 ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                  <div>
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
                      onNavigate={(step) => setActiveStep(step)}
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
              ) : null}

              {activeStep === 6 ? (
                <div className="space-y-4">
                  {resultsDirty ? (
                    <Alert>
                      <AlertTitle>Settings changed</AlertTitle>
                      <AlertDescription>
                        The mapping/rules/filters were updated after the last run. Re-run the analysis to refresh results.
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <StepResults calculation={calculation} onNavigate={(step) => setActiveStep(step)} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {activeStep === 3 && missingRequired.length ? (
            <div className="mt-4">
              <Alert>
                <AlertTitle>Mapping is required to continue</AlertTitle>
                <AlertDescription>
                  Map all required fields to unlock rules, review, and results.
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          {footer}
        </section>
      </main>
    </div>
  );
}
