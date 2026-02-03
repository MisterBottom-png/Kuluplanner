import { useMemo, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable
} from '@tanstack/react-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CalculationResult } from '@/types';

type ExcludedRow = CalculationResult['excludedRows'][number];

interface ExcludedRowTableProps {
  data: ExcludedRow[];
}

export default function ExcludedRowTable({ data }: ExcludedRowTableProps) {
  const reasons = useMemo(() => Array.from(new Set(data.map((d) => d.reason))).sort(), [data]);
  const [reason, setReason] = useState<string>('__all__');
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    if (reason === '__all__') return data;
    return data.filter((d) => d.reason === reason);
  }, [data, reason]);

  const columns = useMemo<ColumnDef<ExcludedRow>[]>(
    () => [
      { accessorKey: 'reason', header: 'Reason' },
      { accessorFn: (row) => row.row.orderId ?? '', header: 'Order ID' },
      { accessorFn: (row) => row.row.shippingDate, header: 'Ship date', cell: (info) => formatDate(info.getValue()) },
      { accessorFn: (row) => row.row.requiredArrivalDate, header: 'Required date', cell: (info) => formatDate(info.getValue()) },
      { accessorFn: (row) => row.row.status, header: 'Status' },
      { accessorFn: (row) => row.row.method, header: 'Method' },
      { accessorFn: (row) => row.row.product, header: 'Product' },
      { accessorFn: (row) => row.row.destinationCountry, header: 'Country' }
    ],
    []
  );

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { pagination: { pageIndex: 0, pageSize } }
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>Excluded rows: {filtered.length}</span>
          <label className="flex items-center gap-2">
            Page size
            <select
              className="rounded-md border border-border bg-background px-2 py-1"
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="w-full sm:w-[280px]">
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger aria-label="Filter by exclusion reason">
              <SelectValue className="truncate" placeholder="Filter by reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All reasons</SelectItem>
              {reasons.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 text-muted-foreground">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button
          className="underline disabled:opacity-50"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </button>
        <span>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <button
          className="underline disabled:opacity-50"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function formatDate(value: unknown) {
  if (!value || !(value instanceof Date)) return '—';
  return value.toISOString().slice(0, 10);
}
