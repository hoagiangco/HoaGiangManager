// Server-side only Excel generator utility
// This file will be loaded only on the server side

export async function generateExcelFile(data: {
  title: string;
  department: string;
  dateRange: string;
  headers: string[];
  rows: any[][];
  fileName: string;
}): Promise<Buffer> {
  // Use require at runtime to avoid build-time issues
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx');
  const xlsxLib = (XLSX as any).default || XLSX;

  // Create workbook
  const wb = xlsxLib.utils.book_new();

  // Prepare worksheet data
  const wsData = [
    [[data.title]], // Title row
    [['Bộ phận báo cáo: ' + data.department]], // Department row
    [[data.dateRange]], // Date range row
    [['']], // Empty row
    data.headers, // Headers
    ...data.rows, // Data rows
  ];

  const ws = xlsxLib.utils.aoa_to_sheet(wsData.flat());

  // Set column widths
  const colWidths = data.headers.map(() => ({ wch: 15 }));
  ws['!cols'] = colWidths;

  // Merge title cells
  const headerCount = data.headers.length;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headerCount - 1 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 1, c: headerCount - 1 } }, // Department
    { s: { r: 2, c: 0 }, e: { r: 2, c: headerCount - 1 } }, // Date range
  ];

  // Add worksheet to workbook
  xlsxLib.utils.book_append_sheet(wb, ws, 'Báo cáo hư hỏng');

  // Generate buffer
  const buffer = xlsxLib.write(wb, { type: 'buffer', bookType: 'xlsx' });
  
  return buffer as Buffer;
}

