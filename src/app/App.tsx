import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import StepHeader from '@/steps/StepHeader';
import StepMapping from '@/steps/StepMapping';
import StepResults from '@/steps/StepResults';
import StepRules from '@/steps/StepRules';
import StepSheet from '@/steps/StepSheet';
import StepUpload from '@/steps/StepUpload';
import { calculateMetrics } from '@/calculations/metrics';
import { DEFAULT_FILTERS, DEFAULT_RULES, OPTIONAL_FIELDS, REQUIRED_FIELDS } from '@/common/constants';
import { readWorkbook, getSheetRows, getSheetSample } from '@/excel/workbook';
import { detectHeaderRow } from '@/parsing/headerDetection';
import { formatMonthKey, normalizeDateInput } from '@/parsing/date';
import { mapRowsToObjects } from '@/parsing/rows';
import { suggestMapping } from '@/parsing/normalize';
import { loadFilters, loadMapping, loadRules, saveFilters, saveMapping, saveRules } from '@/lib/storage';
import type { CalculationResult, FieldMapping, FiltersConfig, RulesConfig, WorkbookInfo } from '@/types';

const steps = [
  'Upload',
  'Sheet selection',
  'Header row',
  'Field mapping',
  'Rules & filters',
  'Results'
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

  useEffect(() => {
    const storedMapping = loadMapping();
    if (storedMapping) setMapping({ ...emptyMapping, ...storedMapping });
    const storedRules = loadRules();
    if (storedRules) setRules(storedRules);
    const storedFilters = loadFilters();
    if (storedFilters) setFilters(storedFilters);
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

  useEffect(() => {
    if (!sheetRows.length) return;
    const { headers } = mapRowsToObjects(sheetRows, headerRowIndex);
    const suggestions = suggestMapping(headers);
    setMapping((prev) => {
      const next = { ...prev };
      Object.entries(suggestions).forEach(([key, value]) => {
        if (!next[key]) {
          next[key] = value;
        }
      });
      return next;
    });
  }, [sheetRows, headerRowIndex]);

  const parsed = useMemo(() => {
    if (!sheetRows.length) return null;
    return mapRowsToObjects(sheetRows, headerRowIndex);
  }, [sheetRows, headerRowIndex]);

  const previewRows = useMemo(() => {
    if (!workbook || !selectedSheet) return [];
    return getSheetSample(workbook, selectedSheet, 6);
  }, [workbook, selectedSheet]);

  const requiredMapped = REQUIRED_FIELDS.every((field) => Boolean(mapping[field.key]));

  const availableMethods = useMemo(() => {
    if (!parsed) return [] as string[];
    const methodColumn = mapping.method;
    if (!methodColumn) return [];
    return Array.from(
      new Set(parsed.rows.map((row) => String(row.raw[methodColumn] ?? '').trim()).filter(Boolean))
    ).sort();
  }, [parsed, mapping.method]);

  const availableProducts = useMemo(() => {
    if (!parsed) return [] as string[];
    const productColumn = mapping.product;
    if (!productColumn) return [];
    return Array.from(
      new Set(parsed.rows.map((row) => String(row.raw[productColumn] ?? '').trim()).filter(Boolean))
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

  const handleFile = async (file: File) => {
    const wb = await readWorkbook(file);
    setWorkbook(wb);
    setWorkbookInfo({
      name: file.name,
      size: file.size,
      sheetNames: wb.SheetNames
    });
    setSelectedSheet(wb.SheetNames[0] ?? null);
    setActiveStep(1);
  };

  const handleCalculate = () => {
    if (!parsed || !requiredMapped) return;
    const rawRows = parsed.rows.map((entry) => entry.raw);
    const result = calculateMetrics(rawRows, mapping, rules, filters);
    setCalculation(result);
    setActiveStep(5);
  };

  const handleClear = () => {
    setWorkbook(null);
    setWorkbookInfo(null);
    setSelectedSheet(null);
    setSheetRows([]);
    setHeaderRowIndex(0);
    setMapping(emptyMapping);
    setCalculation(null);
    setActiveStep(0);
  };

  const warning = !requiredMapped && activeStep >= 3 ? 'Map all required fields to continue.' : '';

  return (
    <div className="min-h-screen bg-slate-950 pb-12 text-slate-100">
      <header className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Turnover &amp; SLA Dashboard</h1>
            <p className="mt-2 text-sm text-slate-300">
              Guided workflow for parsing Excel workbooks into SLA metrics, with explicit quality
              checks and export-ready outputs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Static site ready</Badge>
            <Badge>React + TypeScript</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs ${
                  index <= activeStep ? 'border-emerald-400 text-emerald-300' : 'border-slate-700'
                }`}
                aria-current={index === activeStep ? 'step' : undefined}
              >
                {index + 1}
              </span>
              <span className={index === activeStep ? 'text-slate-100' : 'text-slate-500'}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1) Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <StepUpload workbookInfo={workbookInfo} onFile={handleFile} onClear={handleClear} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2) Sheet selection</CardTitle>
            </CardHeader>
            <CardContent>
              <StepSheet
                sheetNames={workbookInfo?.sheetNames ?? []}
                selectedSheet={selectedSheet}
                previewRows={previewRows}
                onSelectSheet={setSelectedSheet}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3) Header row</CardTitle>
            </CardHeader>
            <CardContent>
              <StepHeader
                headerRowIndex={headerRowIndex}
                rows={sheetRows}
                onChangeHeader={setHeaderRowIndex}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>4) Field mapping</CardTitle>
            </CardHeader>
            <CardContent>
              <StepMapping
                headers={parsed?.headers ?? []}
                rows={parsed?.rows ?? []}
                mapping={mapping}
                onChange={setMapping}
                requiredFields={REQUIRED_FIELDS}
                optionalFields={OPTIONAL_FIELDS}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5) Rules &amp; filters</CardTitle>
            </CardHeader>
            <CardContent>
              <StepRules
                rules={rules}
                filters={filters}
                onChangeRules={setRules}
                onChangeFilters={setFilters}
                availableMethods={availableMethods}
                availableProducts={availableProducts}
                availableMonths={availableMonths}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6) Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {warning ? (
                <Alert>
                  <AlertTitle>Missing mappings</AlertTitle>
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleCalculate}
                  disabled={!requiredMapped || !parsed?.rows.length}
                >
                  Calculate results
                </Button>
                <Button type="button" variant="secondary" onClick={() => setActiveStep(5)}>
                  Jump to results
                </Button>
              </div>
              <Separator />
              <StepResults calculation={calculation} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
