import { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MonthlyTable from '@/results/MonthlyTable';
import RowTable from '@/results/RowTable';
import type { CalculationResult } from '@/types';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

interface StepResultsProps {
  calculation: CalculationResult | null;
}

export default function StepResults({ calculation }: StepResultsProps) {
  const kpis = useMemo(() => {
    if (!calculation) return null;
    const rows = calculation.rows;
    const turnover = rows.map((row) => row.turnoverDays).filter((value): value is number => typeof value === 'number');
    const avgTurnover = turnover.length ? turnover.reduce((acc, value) => acc + value, 0) / turnover.length : null;
    const onTime = rows.filter((row) => row.isOnTime).length;
    const late = rows.filter((row) => row.isOnTime === false).length;
    const shipped = rows.length;
    return {
      shipped,
      avgTurnover: avgTurnover !== null ? avgTurnover.toFixed(1) : '—',
      onTimeRate: shipped ? `${Math.round((onTime / shipped) * 100)}%` : '—',
      lateRate: shipped ? `${Math.round((late / shipped) * 100)}%` : '—'
    };
  }, [calculation]);

  if (!calculation) {
    return (
      <Alert>
        <AlertDescription>Run the calculation to view results.</AlertDescription>
      </Alert>
    );
  }

  const handleExport = (includeExcluded: boolean) => {
    const workbook = XLSX.utils.book_new();
    const monthlySheet = XLSX.utils.json_to_sheet(calculation.monthly);
    XLSX.utils.book_append_sheet(workbook, monthlySheet, 'monthly_summary');

    const includedRows = calculation.rows.map((row) => ({
      ...row,
      orderDate: row.orderDate?.toISOString().slice(0, 10) ?? '',
      shippingDate: row.shippingDate?.toISOString().slice(0, 10) ?? '',
      requiredArrivalDate: row.requiredArrivalDate?.toISOString().slice(0, 10) ?? ''
    }));
    const includedSheet = XLSX.utils.json_to_sheet(includedRows);
    XLSX.utils.book_append_sheet(workbook, includedSheet, 'included_rows');

    if (includeExcluded) {
      const excludedSheet = XLSX.utils.json_to_sheet(
        calculation.excludedRows.map((item) => ({
          reason: item.reason,
          orderDate: item.row.orderDate?.toISOString().slice(0, 10) ?? '',
          shippingDate: item.row.shippingDate?.toISOString().slice(0, 10) ?? '',
          requiredArrivalDate: item.row.requiredArrivalDate?.toISOString().slice(0, 10) ?? '',
          status: item.row.status,
          method: item.row.method,
          product: item.row.product,
          destinationCountry: item.row.destinationCountry
        }))
      );
      XLSX.utils.book_append_sheet(workbook, excludedSheet, 'excluded_rows');
    }

    XLSX.writeFile(workbook, 'turnover_sla_export.xlsx');
  };

  const handleCopy = async () => {
    const header = ['Month', 'Shipped', 'On-time', 'Late', 'On-time %', 'Avg turnover'];
    const rows = calculation.monthly.map((row) => [
      row.month,
      row.shipped,
      row.onTime,
      row.late,
      `${Math.round(row.onTimeRate * 100)}%`,
      row.averageTurnover ?? ''
    ]);
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n');
    await navigator.clipboard.writeText(csv);
  };

  const coverageWarning =
    calculation.quality.rawRows &&
    calculation.quality.includedRows / calculation.quality.rawRows < 0.6
      ? 'Coverage warning: fewer than 60% of raw rows were included.'
      : '';

  return (
    <Tabs defaultValue="summary">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="rows">Row-level</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => handleExport(false)} disabled={!calculation.rows.length}>
            Export summary
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleExport(true)} disabled={!calculation.rows.length}>
            Export with exclusions
          </Button>
          <Button type="button" variant="outline" onClick={handleCopy} disabled={!calculation.rows.length}>
            Copy summary
          </Button>
        </div>
      </div>

      <TabsContent value="summary" className="space-y-6">
        {coverageWarning ? (
          <Alert>
            <AlertDescription>{coverageWarning}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">Shipped rows</p>
            <p className="text-2xl font-semibold text-slate-100">{kpis?.shipped ?? 0}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">Avg turnover (days)</p>
            <p className="text-2xl font-semibold text-slate-100">{kpis?.avgTurnover}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">On-time rate</p>
            <p className="text-2xl font-semibold text-slate-100">{kpis?.onTimeRate}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">Late rate</p>
            <p className="text-2xl font-semibold text-slate-100">{kpis?.lateRate}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-100">On-time vs late by month</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={calculation.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Bar dataKey="onTime" fill="#22c55e" name="On-time" />
                <Bar dataKey="late" fill="#ef4444" name="Late" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-100">Average turnover by month</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={calculation.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Line type="monotone" dataKey="averageTurnover" stroke="#38bdf8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <MonthlyTable data={calculation.monthly} />
      </TabsContent>

      <TabsContent value="rows" className="space-y-4">
        <RowTable data={calculation.rows} />
      </TabsContent>

      <TabsContent value="quality" className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">Raw rows</p>
            <p className="text-2xl font-semibold">{calculation.quality.rawRows}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">Valid rows</p>
            <p className="text-2xl font-semibold">{calculation.quality.validRows}</p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs text-slate-400">Included rows</p>
            <p className="text-2xl font-semibold">{calculation.quality.includedRows}</p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <p className="mb-3 text-sm font-semibold text-slate-100">Exclusion reasons</p>
          {calculation.quality.exclusions.length ? (
            <table className="w-full text-left text-xs">
              <thead className="text-slate-300">
                <tr>
                  <th className="px-2 py-1">Reason</th>
                  <th className="px-2 py-1">Count</th>
                </tr>
              </thead>
              <tbody>
                {calculation.quality.exclusions.map((item) => (
                  <tr key={item.reason} className="border-t border-slate-800">
                    <td className="px-2 py-1">{item.reason}</td>
                    <td className="px-2 py-1">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-slate-400">No exclusions recorded.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
