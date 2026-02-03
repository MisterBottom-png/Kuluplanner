import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  onAutoMatch?: () => void;
  onJumpToHeader?: () => void;
}

function isMappedToExistingHeader(headers: string[], column: string | null | undefined) {
  return Boolean(column && headers.includes(column));
}

function getExamples(rows: Array<{ raw: Record<string, unknown> }>, header: string, limit = 3) {
  const examples: string[] = [];
  for (const row of rows) {
    const value = row.raw[header];
    const str = String(value ?? '').trim();
    if (!str) continue;
    if (!examples.includes(str)) examples.push(str);
    if (examples.length >= limit) break;
  }
  return examples;
}

function groupFor(key: FieldKey): string {
  if (key === 'order_date' || key === 'shipping_date' || key === 'required_arrival_date') return 'Dates';
  if (key === 'status') return 'Status';
  if (key === 'method' || key === 'destination_country') return 'Logistics';
  if (key === 'product') return 'Product';
  return 'Identifiers';
}

export default function StepMapping({
  headers,
  rows,
  mapping,
  onChange,
  requiredFields,
  optionalFields,
  onAutoMatch,
  onJumpToHeader
}: StepMappingProps) {
  const missingRequired = useMemo(() => {
    return requiredFields.filter((field) => !isMappedToExistingHeader(headers, mapping[field.key]));
  }, [headers, mapping, requiredFields]);

  const grouped = useMemo(() => {
    const all = [...requiredFields.map((f) => ({ ...f, required: true })), ...optionalFields.map((f) => ({ ...f, required: false }))];
    const groups = new Map<string, typeof all>();
    for (const field of all) {
      const group = groupFor(field.key);
      if (!groups.has(group)) groups.set(group, [] as any);
      (groups.get(group) as any).push(field);
    }
    return Array.from(groups.entries());
  }, [requiredFields, optionalFields]);

  const hasMissing = missingRequired.length > 0;

  const renderField = (field: FieldDefinition, required: boolean) => {
    const col = mapping[field.key];
    const ok = isMappedToExistingHeader(headers, col);
    const examples = ok ? getExamples(rows, col as string, 3) : [];

    return (
      <div key={field.key} className="rounded-lg border border-border bg-card p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <label className="text-sm font-semibold">{field.label}</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {required ? <Badge className="bg-primary/40">Required</Badge> : <Badge>Optional</Badge>}
              {ok ? <Badge className="bg-secondary/70">Mapped</Badge> : <Badge className="bg-destructive/15 text-destructive">Missing</Badge>}
            </div>
          </div>

          <div className="min-w-[220px] flex-1">
            <Select
              value={mapping[field.key] ?? ''}
              onValueChange={(value) => onChange({ ...mapping, [field.key]: value === '__none__' ? null : value })}
            >
              <SelectTrigger aria-label={`Mapping for ${field.label}`}>
                <SelectValue className="truncate" placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No column</SelectItem>
                {headers.map((header) => (
                  <SelectItem key={header} value={header}>
                    {header || '(empty)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {ok ? (
              <div className="mt-2 text-xs text-muted-foreground">
                Examples: {examples.length ? examples.map((e) => <span key={e} className="mr-2 inline-block rounded bg-muted/50 px-2 py-0.5">{e}</span>) : '—'}
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">Pick the column that contains {field.label.toLowerCase()}.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {hasMissing ? (
        <Alert>
          <AlertTitle>Required fields need mapping</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <div>
                Missing: <strong>{missingRequired.map((f) => f.label).join(', ')}</strong>
              </div>
              <div className="text-muted-foreground">
                If headers look wrong, adjust the header row. Otherwise, map the fields manually.
              </div>
              <div className="flex flex-wrap gap-2">
                {onAutoMatch ? (
                  <Button type="button" variant="secondary" size="sm" onClick={onAutoMatch}>
                    Auto-match again
                  </Button>
                ) : null}
                {onJumpToHeader ? (
                  <Button type="button" variant="outline" size="sm" onClick={onJumpToHeader}>
                    Choose header row
                  </Button>
                ) : null}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>Mappings look good</AlertTitle>
          <AlertDescription>
            All required fields are mapped. You can fine-tune optional fields below.
          </AlertDescription>
        </Alert>
      )}

      {grouped.map(([group, fields]) => (
        <div key={group} className="space-y-2">
          <div className="flex items-end justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</p>
          </div>
          <div className="grid gap-3">
            {(fields as any).map((field: any) => renderField(field, field.required))}
          </div>
        </div>
      ))}
    </div>
  );
}
