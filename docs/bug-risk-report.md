# Bug & Risk Report

This report documents legacy issues discovered in the single-file dashboard and how the migrated React app fixes them.

## 1) Header/column matching fails on spacing & punctuation
- **Legacy location:** `getField()`/manual column name checks in `KPI.html` (hard-coded names like `order_date`, `shipping_date`, etc.).
- **After migration:** `normalizeHeader()` + `suggestMapping()` in `src/parsing/normalize.ts` (lines 1–49).
- **Repro steps:** Use a sheet where headers include spaces or punctuation (e.g., “Order Date”, “Ship Date”).
- **Impact:** Correct columns are not matched, producing empty dates and invalid metrics.
- **Fix implemented:** Normalized header pipeline (trim → lowercase → non-alphanumeric to `_` → collapse) with synonym support and user override mapping.

## 2) Excel date parsing introduces timezone day shifts
- **Legacy location:** `parseExcelDate()` in `KPI.html` (Date parsing uses local timezone).
- **After migration:** `excelSerialToUTCDate()` + `normalizeDateInput()` in `src/parsing/date.ts` (lines 5–41).
- **Repro steps:** Open files with serial dates or DST boundary dates; values shift a day in some locales.
- **Impact:** Month bucketing and SLA comparisons are incorrect.
- **Fix implemented:** Serial dates parse with SheetJS utilities and all date-only values normalize to UTC midnight.

## 3) Data quality metrics computed on filtered dataset
- **Legacy location:** `calculate()` and `applyFiltersAndRender()` in `KPI.html` (metrics based on shipped-only rows).
- **After migration:** `calculateMetrics()` in `src/calculations/metrics.ts` (lines 64–203).
- **Repro steps:** Apply shipped filter; missing fields and invalid rows disappear from quality metrics.
- **Impact:** Quality metrics under-report missing or excluded data.
- **Fix implemented:** Separate counts for raw rows, valid/enriched rows, and included rows; exclusion reasons tracked explicitly.

## 4) Status matching is hidden and non-configurable
- **Legacy location:** `statusMode` dropdown logic in `KPI.html` (hard-coded to substring checks).
- **After migration:** Status configuration UI in `src/steps/StepRules.tsx` (lines 79–135) and matcher in `src/calculations/metrics.ts` (lines 45–57).
- **Repro steps:** Status values differ from “shipped”; no way to configure in legacy.
- **Impact:** Rows incorrectly excluded.
- **Fix implemented:** Visible list of accepted status phrases plus optional regex validation.

## 5) Export/copy enabled without output
- **Legacy location:** `downloadCSV()` / `copyMonthly()` in `KPI.html` (enabled regardless of state).
- **After migration:** Export buttons in `src/steps/StepResults.tsx` (lines 104–122).
- **Repro steps:** Load no data and click export/copy.
- **Impact:** Empty or confusing outputs.
- **Fix implemented:** Export/copy disabled until results are calculated and rows exist; exports include summaries and optional excluded rows.
