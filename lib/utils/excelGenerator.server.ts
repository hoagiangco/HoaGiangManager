// Server-side only Excel generator utility
// Using exceljs instead of xlsx for better Next.js compatibility

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
  const ExcelJS = require('exceljs');
  
  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Báo cáo');

  // Add title row
  const titleRow = worksheet.addRow([data.title]);
  titleRow.font = { bold: true, size: 14 };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.mergeCells(1, 1, 1, data.headers.length);

  // Add department row
  const deptRow = worksheet.addRow(['Bộ phận báo cáo: ' + data.department]);
  deptRow.font = { bold: true };
  worksheet.mergeCells(2, 1, 2, data.headers.length);

  // Add date range row
  const dateRow = worksheet.addRow([data.dateRange]);
  dateRow.font = { bold: true };
  worksheet.mergeCells(3, 1, 3, data.headers.length);

  // Empty row
  worksheet.addRow(['']);

  // Add headers
  const headerRow = worksheet.addRow(data.headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

  // Add data rows
  data.rows.forEach(row => {
    worksheet.addRow(row);
  });

  // Set column widths
  data.headers.forEach((_, index) => {
    worksheet.getColumn(index + 1).width = 15;
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  
  return Buffer.from(buffer);
}

