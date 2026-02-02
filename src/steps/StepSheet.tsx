import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StepSheetProps {
  sheetNames: string[];
  selectedSheet: string | null;
  onSelectSheet: (sheet: string) => void;
}

export default function StepSheet({ sheetNames, selectedSheet, onSelectSheet }: StepSheetProps) {
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
      <p className="text-xs text-muted-foreground">
        Default sheet is <span className="font-semibold text-foreground">feed</span> (when present).
      </p>
    </div>
  );
}
