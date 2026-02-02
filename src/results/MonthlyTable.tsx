import { useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import type { MonthlySummary } from '@/types';

interface MonthlyTableProps {
  data: MonthlySummary[];
}

export default function MonthlyTable({ data }: MonthlyTableProps) {
  const columns = useMemo<ColumnDef<MonthlySummary>[]>(
    () => [
      { accessorKey: 'month', header: 'Month' },
      { accessorKey: 'shipped', header: 'Shipped' },
      { accessorKey: 'onTime', header: 'On-time' },
      { accessorKey: 'late', header: 'Late' },
      {
        accessorKey: 'onTimeRate',
        header: 'On-time %',
        cell: (info) => `${Math.round((info.getValue<number>() ?? 0) * 100)}%`
      },
      {
        accessorKey: 'averageTurnover',
        header: 'Avg turnover (days)',
        cell: (info) => info.getValue<number | null>()?.toFixed(1) ?? '—'
      }
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-card text-muted-foreground">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-3 py-2">
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
  );
}
