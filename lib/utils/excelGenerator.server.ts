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

export async function generateDailyReportExcel(data: {
  title: string;
  date: string;
  summary: {
    totalNew: number;
    totalCompleted: number;
    totalPending: number;
  };
  sections: {
    title: string;
    headers: string[];
    rows: any[][];
  }[];
}): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Báo cáo ngày');

  // Set default column widths early
  worksheet.columns = [
    { key: 'col1', width: 10 },
    { key: 'col2', width: 20 },
    { key: 'col3', width: 25 },
    { key: 'col4', width: 45 },
    { key: 'col5', width: 20 },
    { key: 'col6', width: 20 },
    { key: 'col7', width: 20 },
    { key: 'col8', width: 20 },
  ];

  // 1. Main Title
  const titleRow = worksheet.addRow([data.title]);
  titleRow.font = { bold: true, size: 16, color: { argb: 'FF1E293B' } };
  titleRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(titleRow.number, 1, titleRow.number, 8);

  // 2. Date
  const dateRow = worksheet.addRow(['Ngày báo cáo: ' + data.date]);
  dateRow.font = { italic: true, size: 11, color: { argb: 'FF64748B' } };
  dateRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(dateRow.number, 1, dateRow.number, 8);

  worksheet.addRow([]); // Gap

  // 3. Summary Section
  const summaryHeader = worksheet.addRow(['TỔNG HỢP TRONG NGÀY']);
  summaryHeader.font = { bold: true, size: 12 };
  worksheet.mergeCells(summaryHeader.number, 1, summaryHeader.number, 3);

  const sRow1 = worksheet.addRow(['Việc mới báo cáo:', data.summary.totalNew]);
  const sRow2 = worksheet.addRow(['Việc đã hoàn thành:', data.summary.totalCompleted]);
  const sRow3 = worksheet.addRow(['Việc đang tồn đọng:', data.summary.totalPending]);

  [sRow1, sRow2, sRow3].forEach(row => {
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { horizontal: 'left' };
  });

  worksheet.addRow([]); // Gap

  // 4. Detailed Sections
  data.sections.forEach(section => {
    if (section.rows.length === 0) return;

    const secTitle = worksheet.addRow([section.title.toUpperCase()]);
    secTitle.font = { bold: true, size: 12, color: { argb: 'FF2563EB' } };
    worksheet.mergeCells(secTitle.number, 1, secTitle.number, section.headers.length);

    const headerRow = worksheet.addRow(section.headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.eachCell((cell: any) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
    });

    section.rows.forEach(rowData => {
      const row = worksheet.addRow(rowData);
      row.eachCell((cell: any) => {
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
        cell.alignment = { wrapText: true, vertical: 'middle' };
      });
    });

    worksheet.addRow([]); // Gap between sections
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}




