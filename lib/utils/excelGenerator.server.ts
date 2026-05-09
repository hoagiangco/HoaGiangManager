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

  // Get max header length across all sections
  const maxCols = Math.max(...data.sections.map(s => s.headers.length), 9);

  // 1. Main Title
  const titleRow = worksheet.addRow([data.title]);
  titleRow.font = { bold: true, size: 16, color: { argb: 'FF1E293B' } };
  titleRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(titleRow.number, 1, titleRow.number, maxCols);

  // 2. Date
  const dateRow = worksheet.addRow(['Ngày báo cáo: ' + data.date]);
  dateRow.font = { italic: true, size: 11, color: { argb: 'FF64748B' } };
  dateRow.alignment = { horizontal: 'center' };
  worksheet.mergeCells(dateRow.number, 1, dateRow.number, maxCols);

  worksheet.addRow([]); // Single Gap

  // 3. Summary Section - Balanced Horizontal Layout using merged cells
  const summaryRowNum = worksheet.addRow([]).number;
  worksheet.getRow(summaryRowNum).height = 25;

  const stats = [
    { label: 'Việc mới:', value: data.summary.totalNew, color: 'FF22C55E', cols: [2, 3] },
    { label: 'Đang xử lý:', value: data.summary.totalActive ?? 0, color: 'FF06B6D4', cols: [4, 4] },
    { label: 'Đã xong:', value: data.summary.totalCompleted, color: 'FF3B82F6', cols: [5, 6] },
    { label: 'Tồn đọng:', value: data.summary.totalPending, color: 'FFEF4444', cols: [7, 8] }
  ];

  stats.forEach(s => {
    const cell = worksheet.getCell(summaryRowNum, s.cols[0]);
    cell.value = {
      richText: [
        { text: s.label + ' ', font: { bold: true, size: 10, color: { argb: 'FF475569' } } },
        { text: String(s.value), font: { bold: true, size: 11, color: { argb: s.color } } }
      ]
    };
    
    if (s.cols[0] !== s.cols[1]) {
      worksheet.mergeCells(summaryRowNum, s.cols[0], summaryRowNum, s.cols[1]);
    }
    
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'medium', color: { argb: s.color } } };
  });

  worksheet.addRow([]); // Single Gap

  // Set Column Widths dynamically
  if (data.sections.length > 0) {
    data.sections[0].headers.forEach((header, index) => {
      const h = header.toLowerCase();
      let width = 15;
      if (h === 'stt') width = 6;
      else if (h === 'id' || h === 'mã số') width = 10;
      else if (h.includes('ngày')) width = 14;
      else if (h.includes('nội dung') || h.includes('tiến độ') || h.includes('ghi chú')) width = 40;
      else if (h.includes('thiết bị') || h.includes('vị trí')) width = 22;
      else if (h.includes('người báo') || h.includes('người xử')) width = 18;
      
      worksheet.getColumn(index + 1).width = width;
    });
  }

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




