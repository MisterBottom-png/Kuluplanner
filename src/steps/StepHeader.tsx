import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { detectHeaderRow } from '@/parsing/headerDetection';

interface StepHeaderProps {
  headerRowIndex: number;
  rows: unknown[][];
  onChangeHeader: (index: number) => void;
}

export default function StepHeader({ headerRowIndex, rows, onChangeHeader }: StepHeaderProps) {
  const options = useMemo(() => rows.slice(0, 20).map((_, index) => index), [rows]);
  const detected = useMemo(() => detectHeaderRow(rows), [rows]);

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-300">
        Auto-detected header row: <strong>Row {detected.rowIndex + 1}</strong> (confidence{' '}
        {Math.round(detected.confidence * 100)}%).
      </div>
      <Select value={String(headerRowIndex)} onValueChange={(value) => onChangeHeader(Number(value))}>
        <SelectTrigger aria-label="Header row">
          <SelectValue placeholder="Select header row" />
        </SelectTrigger>
        <SelectContent>
          {options.map((index) => (
            <SelectItem key={index} value={String(index)}>
              Row {index + 1}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-xs text-slate-300">
        <p className="mb-2 font-semibold text-slate-200">Header preview</p>
        {rows.slice(0, 8).map((row, index) => (
          <div
            key={index}
            className={`mb-1 rounded-md px-2 py-1 ${
              index === headerRowIndex ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-900/80'
            }`}
          >
            {row.slice(0, 6).map((cell, cellIndex) => (
              <span key={cellIndex} className="mr-3">
                {String(cell ?? '')}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
