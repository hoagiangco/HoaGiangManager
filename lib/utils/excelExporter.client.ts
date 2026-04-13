import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { formatDateDisplay } from './dateFormat';

export interface ExcelColumn {
  id: string;
  label: string;
  width?: number;
}

export interface ExportToExcelOptions {
  title: string;
  filename: string;
  columns: ExcelColumn[];
  data: any[];
  sheetName?: string;
  subtitle?: string;
}

/**
 * Strips HTML tags from a string
 */
export const stripHtml = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
};

/**
 * Unified Client-side Excel Exporter for HoaGiang Manager
 */
export const exportToExcel = async ({
  title,
  filename,
  columns,
  data,
  sheetName = 'Báo cáo',
  subtitle = `Ngày xuất: ${new Date().toLocaleString('vi-VN')}`
}: ExportToExcelOptions) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // 1. Setup Title
    const headerRange = String.fromCharCode(64 + Math.min(columns.length, 26)) + '1';
    // Handle titles beyond 26 columns if necessary, but here we assume < 26
    worksheet.mergeCells(`A1:${columns.length <= 26 ? headerRange : 'Z1'}`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title.toUpperCase();
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // 2. Setup Subtitle
    worksheet.mergeCells(`A2:${columns.length <= 26 ? headerRange.replace('1', '2') : 'Z2'}`);
    const subCell = worksheet.getCell('A2');
    subCell.value = subtitle;
    subCell.font = { italic: true, size: 10, color: { argb: 'FF64748B' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.addRow([]); // Blank row

    // 3. Headers
    const headerLabels = columns.map(col => col.label);
    const headerRow = worksheet.addRow(headerLabels);
    
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2C3E50' } // Midnight Blue / Dark Slate
      };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    headerRow.height = 25;

    // 4. Data Rows
    data.forEach((item, index) => {
      const rowData = columns.map(col => {
        const val = item[col.id];
        // Automatic formatting for common types
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes('<')) return stripHtml(val);
        return val;
      });

      const row = worksheet.addRow(rowData);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    // 5. Adjust Column Widths
    worksheet.columns = columns.map(col => ({
      width: col.width || 20,
      header: col.label,
      key: col.id
    }));

    // Generate and Download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);

    return true;
  } catch (error) {
    console.error('Excel Export Error:', error);
    throw error;
  }
};
