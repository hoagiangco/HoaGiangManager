import { NextRequest, NextResponse } from 'next/server';
import { WeeklyScheduleService } from '@/lib/services/weeklyScheduleService';

const svc = new WeeklyScheduleService();

const DAY_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

function formatDate(dateStr: string, offsetDays: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${String(d.getUTCFullYear()).slice(2)}`;
}

function formatFullDate(dateStr: string, offsetDays: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('weekStart');
    const departmentIdsParam = searchParams.get('departmentIds');

    if (!weekStart) {
      return NextResponse.json({ status: false, error: 'Missing weekStart' }, { status: 400 });
    }

    const monday = WeeklyScheduleService.getMondayOf(weekStart);
    const departmentIds = departmentIdsParam
      ? departmentIdsParam.split(',').map(Number).filter(Boolean)
      : undefined;

    const groups = await svc.getForExport(monday, departmentIds);
    const weeklyNote = await svc.getWeeklyNote(monday);

    const dateRange = `Từ ngày ${formatFullDate(monday, 0)} đến ${formatFullDate(monday, 6)}`;

    const allDeptNames = groups.map(g => g.departmentName.toUpperCase()).join(', ');
    const title = `LỊCH LÀM VIỆC TUẦN BP. ${allDeptNames}`;

    // Build HTML styles
    const styles = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; background: #fff; color: #000; }
        .schedule-wrapper { padding: 10px; }
        .print-header { text-align: center; margin-bottom: 8px; }
        .print-header h2 { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
        .print-header p { font-size: 12px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #555; padding: 5px 6px; vertical-align: top; }
        th { background: #b8cce4; text-align: center; font-weight: bold; font-size: 11px; }
        th.date-row { background: #dce6f1; font-weight: normal; font-size: 10px; }
        .dept-header td { background: #dce6f1; font-weight: bold; text-align: left; font-size: 11px; padding: 4px 6px; }
        .staff-name { min-width: 120px; font-weight: 600; height: 60px; vertical-align: middle; }
        .day-cell { text-align: center; white-space: pre-wrap; min-width: 70px; line-height: 1.4; height: 60px; vertical-align: middle; }
        .footer-note { font-weight: bold; margin-top: 15px; font-size: 12px; white-space: pre-wrap; }
        .footer-signatures { display: flex; justify-content: space-between; margin-top: 40px; font-weight: bold; font-size: 12px; }
        .footer-signatures div { width: 30%; text-align: center; }
        .signature-space { height: 60px; }
        @media print {
          body { font-size: 10px; }
          @page { size: landscape; margin: 8mm; }
          th { background: #b8cce4 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          th.date-row { background: #dce6f1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .dept-header td { background: #dce6f1 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .footer-note { font-size: 10px; }
          .footer-signatures { font-size: 10px; margin-top: 20px; }
        }
      </style>
    `;

    // Build header columns
    const headerCols = DAY_LABELS.map(lbl => `<th>${lbl}</th>`).join('');
    const dateCols = Array.from({ length: 7 }, (_, i) =>
      `<th class="date-row">${formatDate(monday, i)}</th>`
    ).join('');

    // Build all department rows in a single table
    const deptRows = groups.map(group => {
      const deptHeaderRow = `<tr class="dept-header"><td colspan="8">${group.departmentName.toUpperCase()}</td></tr>`;
      const staffRows = group.staff.map(s => {
        const dayCells = Array.from({ length: 7 }, (_, i) => {
          const cell = s.days[i + 1];
          const content = cell?.content || '';
          const note = cell?.note || '';
          const display = note ? `${content}\n${note}` : content;
          return `<td class="day-cell">${display.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</td>`;
        }).join('');
        return `<tr>
          <td class="staff-name">${s.staffName.replace(/&/g, '&amp;')}</td>
          ${dayCells}
        </tr>`;
      }).join('');
      return deptHeaderRow + staffRows;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title} - ${dateRange}</title>
  ${styles}
</head>
<body>
  <div class="schedule-wrapper">
    <div class="print-header">
      <h2>${title}</h2>
      <p>${dateRange}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th rowspan="2">Họ và tên</th>
          ${headerCols}
        </tr>
        <tr>
          ${dateCols}
        </tr>
      </thead>
      <tbody>
        ${deptRows}
      </tbody>
    </table>
    
    ${weeklyNote ? `<div class="footer-note">Lưu ý:<br/>${weeklyNote.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</div>` : ''}
    
    <div class="footer-signatures">
      <div>Duyệt</div>
      <div>
        Người lập
        <div class="signature-space"></div>
        
      </div>
    </div>
  </div>
  <script>
    window.onload = () => {
      window.print();
    };
    window.onafterprint = () => {
      window.close();
    };
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error: any) {
    return NextResponse.json({ status: false, error: error.message }, { status: 500 });
  }
}
