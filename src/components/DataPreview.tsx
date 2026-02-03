import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DataPreviewProps {
  headers: string[];
  rows: Array<{ raw: Record<string, unknown> }>;
  maxRows?: number;
  maxColumns?: number;
  highlightedHeaders?: string[];
  caption?: string;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str.length > 60 ? `${str.slice(0, 57)}…` : str;
}

export default function DataPreview({
  headers,
  rows,
  maxRows = 18,
  maxColumns = 8,
  highlightedHeaders = [],
  caption
}: DataPreviewProps) {
  const highlightSet = useMemo(() => new Set(highlightedHeaders), [highlightedHeaders]);
  const previewRows = rows.slice(0, maxRows);
  const previewHeaders = useMemo(() => headers.slice(0, Math.max(1, maxColumns)), [headers, maxColumns]);
  const hiddenColumnCount = Math.max(0, headers.length - previewHeaders.length);

  if (!headers.length) {
    return <div className="text-xs text-muted-foreground">No preview available.</div>;
  }

  return (
    <div className="min-w-0 space-y-2">
      {caption ? <div className="text-xs font-semibold text-muted-foreground">{caption}</div> : null}
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="max-h-[420px] max-w-full overflow-auto">
          <table className="w-full table-fixed text-left text-xs">
            <thead className="sticky top-0 bg-card">
              <tr>
                {previewHeaders.map((header) => (
                  <th
                    key={header}
                    className={cn(
                      'truncate border-b border-border px-3 py-2 font-semibold',
                      highlightSet.has(header) ? 'bg-muted/60' : ''
                    )}
                  >
                    {header || <span className="text-muted-foreground">(empty)</span>}
                  </th>
                ))}
                {hiddenColumnCount ? (
                  <th className="truncate border-b border-border px-3 py-2 text-muted-foreground">
                    +{hiddenColumnCount} more
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, idx) => (
                <tr key={idx} className="border-t border-border">
                  {previewHeaders.map((header) => (
                    <td
                      key={header}
                      className={cn(
                        'truncate px-3 py-2 text-foreground',
                        highlightSet.has(header) ? 'bg-muted/40' : ''
                      )}
                      title={String(row.raw[header] ?? '')}
                    >
                      {formatCell(row.raw[header])}
                    </td>
                  ))}
                  {hiddenColumnCount ? (
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">…</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">Showing {Math.min(rows.length, maxRows)} of {rows.length} rows.</div>
    </div>
  );
}
