import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { detectHeaderRow } from '@/parsing/headerDetection';

interface StepHeaderProps {
  headerRowIndex: number;
  rows: unknown[][];
  onChangeHeaderRowIndex: (index: number) => void;
}

export default function StepHeader({ headerRowIndex, rows, onChangeHeaderRowIndex }: StepHeaderProps) {
  const detected = useMemo(() => detectHeaderRow(rows), [rows]);

  const confidence = Math.round(detected.confidence * 100);
  const isWeak = confidence < 45;

  const previewRows = rows.slice(0, Math.min(rows.length, 12));
  const maxCols = previewRows.reduce((acc, row) => Math.max(acc, row.length), 0);
  const colCount = Math.min(maxCols, 8);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <div className="text-sm">
          We detected the header row automatically, but you can override it.
        </div>
        <div className="text-xs text-muted-foreground">
          Suggested header row: <strong>Row {detected.rowIndex + 1}</strong> (confidence {confidence}%).
        </div>
        {isWeak ? (
          <div className="text-xs text-muted-foreground">
            Detection confidence is low. Pick the row that contains column names.
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Header row</p>
            <p className="text-xs text-muted-foreground">Current selection: Row {headerRowIndex + 1}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onChangeHeaderRowIndex(detected.rowIndex)}
              disabled={!rows.length}
            >
              Use suggested
            </Button>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-border">
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-card">
                <tr>
                  <th className="w-20 border-b border-border px-2 py-2 text-muted-foreground">Row</th>
                  {Array.from({ length: colCount }).map((_, i) => (
                    <th key={i} className="border-b border-border px-2 py-2 text-muted-foreground">
                      Col {i + 1}
                    </th>
                  ))}
                  <th className="border-b border-border px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => {
                  const isSelected = idx === headerRowIndex;
                  const isSuggested = idx === detected.rowIndex;
                  return (
                    <tr key={idx} className={isSelected ? 'bg-muted/40' : 'border-t border-border'}>
                      <td className="whitespace-nowrap px-2 py-2 font-semibold">
                        {idx + 1}
                        {isSuggested ? <span className="ml-2 rounded-full bg-muted/60 px-2 py-0.5 text-[10px]">suggested</span> : null}
                      </td>
                      {Array.from({ length: colCount }).map((_, i) => (
                        <td key={i} className="whitespace-nowrap px-2 py-2" title={String(row[i] ?? '')}>
                          {String(row[i] ?? '')}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right">
                        <Button
                          type="button"
                          variant={isSelected ? 'outline' : 'secondary'}
                          size="sm"
                          onClick={() => onChangeHeaderRowIndex(idx)}
                        >
                          {isSelected ? 'Selected' : 'Use as header'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-2 text-xs text-muted-foreground">
          Tip: headers should be unique and readable (e.g., "Order date", "Shipping date").
        </div>
      </div>
    </div>
  );
}
