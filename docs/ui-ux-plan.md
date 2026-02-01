# UI/UX Redesign Plan

## Information architecture & step flow
1. **Upload**
   - Drag/drop zone with clear replace/clear actions.
   - Workbook name, size, and sheet count summary.
2. **Sheet selection**
   - Sheet list with preview table of first rows.
3. **Header row detection**
   - Auto-detected header row with confidence indicator.
   - Manual override dropdown and inline preview highlighting the header row.
4. **Field mapping**
   - Required fields (order date, shipping date, required arrival/SLA date, status, method, product, destination country).
   - Optional fields (order ID, customer) for export/context.
   - Sample values displayed under each mapping to validate correctness.
5. **Rules & filters**
   - Business rules (exclude China, shipped status matching).
   - Filters for method, product, and month range with removable chips and clear-all.
6. **Results**
   - KPI tiles, charts (on-time vs late, average turnover), monthly summary table, row-level table, and quality view.

## Mapping UX and data validation
- Normalize header labels and propose defaults using synonym lookup.
- Block “Calculate” until all required fields are mapped.
- Provide warnings if coverage is low or mapping is incomplete.
- Always show the source column name alongside mapped values in results/export.

## Table/filters/charts improvements
- Monthly summary table is sortable and compact for scanning.
- Row-level table is paginated to avoid large DOM payloads.
- On-time vs late is visualized as stacked bars; turnover uses a line chart for trend readability.
- Filters are visible as chips for quick removal.

## Accessibility checklist
- ARIA support for tabs, dialog, and select controls via Radix primitives.
- Keyboard navigation across the stepper and form inputs.
- Visible focus states with consistent outline.
- Screen-reader labels for all inputs and dropdowns.
- Color contrast verified for text over dark backgrounds.

## Visual system/tokens
- Dark UI with slate backgrounds and emerald accent for primary actions.
- Tailwind tokens set via CSS variables for easy theming.
- Rounded cards, subtle borders, and consistent spacing.
