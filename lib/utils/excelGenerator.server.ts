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
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Báo cáo');

  // Set Page Orientation to Landscape and A4
  worksheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3, header: 0, footer: 0 }
  };

  // 1. Header Information
  const titleRow = worksheet.addRow([data.title]);
  titleRow.font = { bold: true, size: 16, color: { argb: 'FF1E293B' } };
  titleRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(1, 1, 1, data.headers.length);

  const infoRow = worksheet.addRow([`Bộ phận: ${data.department}  |  ${data.dateRange}`]);
  infoRow.font = { italic: true, size: 11, color: { argb: 'FF475569' } };
  infoRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(2, 1, 2, data.headers.length);

  worksheet.addRow([]); // Gap

  // 2. Add Table Headers
  const headerRow = worksheet.addRow(data.headers);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.height = 25;
  headerRow.eachCell((cell: any) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
  });

  // 3. Add Data Rows
  data.rows.forEach(rowData => {
    const row = worksheet.addRow(rowData);
    row.eachCell((cell: any) => {
      cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' };
      
      // Center align specific columns like STT, ID, Dates, Status
      const colIdx = cell.fullAddress.col;
      const header = data.headers[colIdx - 1]?.toLowerCase() || '';
      if (header === 'stt' || header === 'id' || header.includes('ngày') || header === 'trạng thái' || header === 'mức độ') {
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
    });
  });

  // 4. Smart Column Widths
  data.headers.forEach((header, index) => {
    const h = header.toLowerCase();
    let width = 15;
    if (h === 'stt') width = 6;
    else if (h === 'id' || h === 'mã số') width = 10;
    else if (h.includes('ngày')) width = 14;
    else if (h.includes('nội dung') || h.includes('tiến độ') || h.includes('ghi chú')) width = 45;
    else if (h.includes('thiết bị') || h.includes('vị trí')) width = 25;
    
    worksheet.getColumn(index + 1).width = width;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function generateDailyReportExcel(data: {
  title: string;
  date: string;
  summary: {
    totalNew: number;
    totalActive?: number;
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

  // Set default column widths early - Optimized for A4 Landscape (9 columns total)
  worksheet.columns = [
    { key: 'col1', width: 6 },   // STT
    { key: 'col2', width: 10 },  // Mã số
    { key: 'col3', width: 14 },  // Ngày báo cáo
    { key: 'col4', width: 22 },  // Thiết bị/Vị trí
    { key: 'col5', width: 18 },  // Người báo cáo
    { key: 'col6', width: 40 },  // Nội dung sự cố
    { key: 'col7', width: 18 },  // Người xử lý
    { key: 'col8', width: 14 },  // Trạng thái
    { key: 'col9', width: 40 },  // Tiến độ xử lý
  ];

  // 1. Main Title
  const titleRow = worksheet.addRow([data.title]);
  titleRow.font = { bold: true, size: 16, color: { argb: 'FF1E293B' } };
  titleRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(titleRow.number, 1, titleRow.number, 9);

  // 2. Date
  const dateRow = worksheet.addRow(['Ngày báo cáo: ' + data.date]);
  dateRow.font = { italic: true, size: 11, color: { argb: 'FF64748B' } };
  dateRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(dateRow.number, 1, dateRow.number, 9);

  worksheet.addRow([]); // Single Gap

  // 3. Summary Section - Compact Horizontal Layout
  const summaryRow = worksheet.addRow([
    '', 'Việc mới:', data.summary.totalNew,
    'Đang xử lý:', data.summary.totalActive ?? 0,
    'Đã xong:', data.summary.totalCompleted,
    'Tồn đọng:', data.summary.totalPending
  ]);

  summaryRow.height = 20;
  const summaryColors = ['FF22C55E', 'FF06B6D4', 'FF3B82F6', 'FFEF4444']; // success, info, primary, danger
  
  // Align metrics across the 9 columns (leaving Col 1 empty for padding)
  [2, 4, 6, 8].forEach((colIdx, i) => {
    const labelCell = summaryRow.getCell(colIdx);
    const valueCell = summaryRow.getCell(colIdx + 1);
    
    labelCell.font = { bold: true, size: 10, color: { argb: 'FF475569' } };
    labelCell.alignment = { horizontal: 'right', vertical: 'middle' };
    
    valueCell.font = { bold: true, size: 11, color: { argb: summaryColors[i] } };
    valueCell.alignment = { horizontal: 'left', vertical: 'middle' };
    valueCell.border = { bottom: { style: 'medium', color: { argb: summaryColors[i] } } };
  });

  worksheet.addRow([]); // Single Gap

  // Set Page Orientation to Landscape
  worksheet.pageSetup = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3, header: 0, footer: 0 }
  };

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




