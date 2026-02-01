import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { FieldKey, FieldMapping } from '@/types';

interface FieldDefinition {
  key: FieldKey;
  label: string;
}

interface StepMappingProps {
  headers: string[];
  rows: Array<{ raw: Record<string, unknown> }>;
  mapping: FieldMapping;
  onChange: (mapping: FieldMapping) => void;
  requiredFields: FieldDefinition[];
  optionalFields: FieldDefinition[];
}

export default function StepMapping({
  headers,
  rows,
  mapping,
  onChange,
  requiredFields,
  optionalFields
}: StepMappingProps) {
  const sampleValues = useMemo(() => {
    const samples: Record<string, string[]> = {};
    headers.forEach((header) => {
      samples[header] = rows
        .slice(0, 3)
        .map((row) => String(row.raw[header] ?? '').trim())
        .filter(Boolean);
    });
    return samples;
  }, [headers, rows]);

  const renderField = (field: FieldDefinition, required = false) => (
    <div key={field.key} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-100">{field.label}</label>
        {required ? <Badge className="bg-emerald-500/20 text-emerald-200">Required</Badge> : null}
      </div>
      <div className="mt-2">
        <Select
          value={mapping[field.key] ?? ''}
          onValueChange={(value) => onChange({ ...mapping, [field.key]: value || null })}
        >
          <SelectTrigger aria-label={`Mapping for ${field.label}`}>
            <SelectValue placeholder="Select column" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">No column</SelectItem>
            {headers.map((header) => (
              <SelectItem key={header} value={header}>
                {header}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-2 text-xs text-slate-400">
        {mapping[field.key] && sampleValues[mapping[field.key] ?? '']?.length ? (
          <span>Sample: {sampleValues[mapping[field.key] ?? ''].join(' · ')}</span>
        ) : (
          <span>No sample values available.</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {requiredFields.map((field) => renderField(field, true))}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Optional fields
        </p>
        <div className="grid gap-3">
          {optionalFields.map((field) => renderField(field))}
        </div>
      </div>
    </div>
  );
}
