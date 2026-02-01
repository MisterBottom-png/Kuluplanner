import * as XLSX from 'xlsx';

export async function readWorkbook(file: File) {
  const buffer = await file.arrayBuffer();
  return XLSX.read(buffer, { type: 'array', cellDates: true });
}

export function getSheetRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [] as unknown[][];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' }) as unknown[][];
}

export function getSheetSample(workbook: XLSX.WorkBook, sheetName: string, rows = 5) {
  const sheetRows = getSheetRows(workbook, sheetName);
  return sheetRows.slice(0, rows);
}
