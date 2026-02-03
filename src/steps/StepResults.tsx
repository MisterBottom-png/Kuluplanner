import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportResultsToPdf } from '@/exports/pdf';
import MonthlyTable from '@/results/MonthlyTable';
import RowTable from '@/results/RowTable';
import ExcludedRowTable from '@/results/ExcludedRowTable';
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
  onNavigate?: (stepIndex: number) => void;
}

const PALETTE = {
  parchment: '#edede9',
  dust: '#d6ccc2',
  linen: '#f5ebe0',
  petal: '#e3d5ca',
  almond: '#d5bdaf'
};

export default function StepResults({ calculation, onNavigate }: StepResultsProps) {
  const [activeTab, setActiveTab] = useState('summary');
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyFallback, setCopyFallback] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const kpis = useMemo(() => {
    if (!calculation) return null;
    const rows = calculation.rows;
    const turnover = rows
      .map((row) => row.turnoverDays)
      .filter((value): value is number => typeof value === 'number');
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
          destinationCountry: item.row.destinationCountry,
          orderId: item.row.orderId ?? '',
          customer: item.row.customer ?? ''
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
    try {
      await navigator.clipboard.writeText(csv);
      setCopyFeedback({ type: 'success', message: 'Summary copied to clipboard.' });
      setCopyDialogOpen(false);
    } catch (error) {
      console.error('Failed to copy summary CSV', error);
      setCopyFallback(csv);
      setCopyFeedback({ type: 'error', message: 'Could not copy. Use the manual copy dialog instead.' });
      setCopyDialogOpen(true);
    }
  };

  const handleExportPdf = async () => {
    setActiveTab('summary');
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (resultsRef.current) {
      await exportResultsToPdf(resultsRef.current);
    }
  };

  const coverageRatio = calculation.quality.rawRows ? calculation.quality.includedRows / calculation.quality.rawRows : 1;
  const coverageWarning = calculation.quality.rawRows && coverageRatio < 0.6;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="rows">Included rows</TabsTrigger>
          <TabsTrigger value="excluded">Excluded rows</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => handleExport(false)} disabled={!calculation.rows.length}>
            Export summary
          </Button>
          <Button type="button" variant="secondary" onClick={() => handleExport(true)} disabled={!calculation.rows.length}>
            Export with exclusions
          </Button>
          <Button type="button" variant="secondary" onClick={handleExportPdf} disabled={!calculation.rows.length}>
            Export PDF
          </Button>
          <Button type="button" variant="outline" onClick={handleCopy} disabled={!calculation.rows.length}>
            Copy summary
          </Button>
        </div>
        {copyFeedback ? (
          <p
            className={`text-xs ${copyFeedback.type === 'success' ? 'text-emerald-600' : 'text-destructive'}`}
            role="status"
          >
            {copyFeedback.message}
          </p>
        ) : null}
      </div>
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy the summary CSV</DialogTitle>
            <DialogDescription>
              Clipboard access was blocked. Select and copy the CSV data below.
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-[200px] w-full rounded-md border border-border bg-background p-3 text-xs"
            readOnly
            value={copyFallback}
          />
        </DialogContent>
      </Dialog>

      <TabsContent value="summary" className="space-y-6">
        <div ref={resultsRef} className="space-y-6">
          {coverageWarning ? (
            <Alert>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <AlertDescription>
                  Coverage warning: only {Math.round(coverageRatio * 100)}% of raw rows were included.
                </AlertDescription>
                <Dialog open={coverageOpen} onOpenChange={setCoverageOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm">Explain</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Why rows were excluded</DialogTitle>
                      <DialogDescription>
                        Most exclusions come from missing dates/status matches or filtered methods/products.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-card">
                          <tr>
                            <th className="px-3 py-2 text-muted-foreground">Reason</th>
                            <th className="px-3 py-2 text-muted-foreground">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {calculation.quality.exclusions.map((item) => (
                            <tr key={item.reason} className="border-t border-border">
                              <td className="px-3 py-2">{item.reason}</td>
                              <td className="px-3 py-2">{item.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => { setCoverageOpen(false); onNavigate?.(4); }}>
                        Review filters
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setCoverageOpen(false); onNavigate?.(3); }}>
                        Review mapping
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Shipped rows</p>
              <p className="text-2xl font-semibold">{kpis?.shipped ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Avg turnover (days)</p>
              <p className="text-2xl font-semibold">{kpis?.avgTurnover}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">On-time rate</p>
              <p className="text-2xl font-semibold">{kpis?.onTimeRate}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Late rate</p>
              <p className="text-2xl font-semibold">{kpis?.lateRate}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-3 text-sm font-semibold">On-time vs late by month</p>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={calculation.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.dust} />
                  <XAxis dataKey="month" stroke="#1f1e1c" />
                  <YAxis stroke="#1f1e1c" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="onTime" fill={PALETTE.almond} name="On-time" />
                  <Bar dataKey="late" fill={PALETTE.petal} name="Late" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-3 text-sm font-semibold">Average turnover by month</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={calculation.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.dust} />
                  <XAxis dataKey="month" stroke="#1f1e1c" />
                  <YAxis stroke="#1f1e1c" />
                  <Tooltip />
                  <Line type="monotone" dataKey="averageTurnover" stroke={PALETTE.almond} strokeWidth={3} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <MonthlyTable data={calculation.monthly} />
        </div>
      </TabsContent>

      <TabsContent value="rows" className="space-y-4">
        <RowTable data={calculation.rows} />
      </TabsContent>

      <TabsContent value="excluded" className="space-y-4">
        {calculation.excludedRows.length ? (
          <ExcludedRowTable data={calculation.excludedRows} />
        ) : (
          <Alert>
            <AlertDescription>No excluded rows recorded.</AlertDescription>
          </Alert>
        )}
      </TabsContent>

      <TabsContent value="quality" className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Raw rows</p>
            <p className="text-2xl font-semibold">{calculation.quality.rawRows}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Valid rows</p>
            <p className="text-2xl font-semibold">{calculation.quality.validRows}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Included rows</p>
            <p className="text-2xl font-semibold">{calculation.quality.includedRows}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">Exclusion reasons</p>
          {calculation.quality.exclusions.length ? (
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="px-2 py-1">Reason</th>
                  <th className="px-2 py-1">Count</th>
                </tr>
              </thead>
              <tbody>
                {calculation.quality.exclusions.map((item) => (
                  <tr key={item.reason} className="border-t border-border">
                    <td className="px-2 py-1">{item.reason}</td>
                    <td className="px-2 py-1">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-muted-foreground">No exclusions recorded.</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
