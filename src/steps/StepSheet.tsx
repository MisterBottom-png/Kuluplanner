import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StepSheetProps {
  sheetNames: string[];
  selectedSheet: string | null;
  previewRows: unknown[][];
  onSelectSheet: (sheet: string) => void;
}

export default function StepSheet({
  sheetNames,
  selectedSheet,
  previewRows,
  onSelectSheet
}: StepSheetProps) {
  return (
    <div className="space-y-3">
      <Select value={selectedSheet ?? ''} onValueChange={onSelectSheet}>
        <SelectTrigger aria-label="Select sheet">
          <SelectValue placeholder="Select a sheet" />
        </SelectTrigger>
        <SelectContent>
          {sheetNames.map((sheet) => (
            <SelectItem key={sheet} value={sheet}>
              {sheet}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-2 text-xs text-slate-300">
        <p className="mb-2 font-semibold text-slate-200">Preview (first rows)</p>
        {previewRows.length ? (
          <table className="w-full text-left">
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={index}>
                  {row.slice(0, 6).map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-slate-800 px-2 py-1">
                      {String(cell ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-slate-500">Select a sheet to preview its content.</p>
        )}
      </div>
    </div>
  );
}
