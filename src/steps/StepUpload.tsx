import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WorkbookInfo } from '@/types';

interface StepUploadProps {
  workbookInfo: WorkbookInfo | null;
  onFile: (file: File) => void;
  onClear: () => void;
}

export default function StepUpload({ workbookInfo, onFile, onClear }: StepUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files?.[0]) return;
    onFile(files[0]);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div
        className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/60 p-4 text-center text-sm text-slate-300"
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <p className="font-medium text-slate-200">Drag and drop your Excel file</p>
        <p className="text-xs text-slate-400">or click to browse .xlsx files</p>
        <Button type="button" variant="secondary" className="mt-3" onClick={() => inputRef.current?.click()}>
          Choose file
        </Button>
      </div>

      {workbookInfo ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
          <div>
            <p className="font-semibold text-slate-100">{workbookInfo.name}</p>
            <p>{(workbookInfo.size / 1024).toFixed(1)} KB</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{workbookInfo.sheetNames.length} sheets</Badge>
            <Button type="button" variant="outline" onClick={onClear}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
