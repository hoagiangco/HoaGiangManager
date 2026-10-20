import { NextRequest, NextResponse } from 'next/server';
import { WeeklyScheduleService } from '@/lib/services/weeklyScheduleService';
import { requirePermission } from '@/lib/auth/middleware';
import { Permission } from '@/lib/auth/permissions';

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
    const authorization = await requirePermission(req, Permission.WeeklyScheduleManage);
    if (!authorization.authorized) return authorization.response;

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
    const weeklyMeta = await svc.getWeeklyMeta(monday);
    const weeklyNote = weeklyMeta.note;
    const creatorSignatureUrl = weeklyMeta.creatorSignatureUrl;
    const creatorName = weeklyMeta.creatorName;

    const dateRange = `Từ ngày ${formatFullDate(monday, 0)} đến ${formatFullDate(monday, 6)}`;

    const allDeptNames = groups.map(g => g.departmentName.toUpperCase()).join(', ');
    const title = `LỊCH LÀM VIỆC TUẦN BP. ${allDeptNames}`;

    // Build HTML styles
    const styles = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          width: 100%;
          background: #fff;
          color: #000;
          font-family: Arial, sans-serif;
          font-size: 11px;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .schedule-wrapper {
          width: 100%;
          padding: 4px 6px;
          display: flex;
          flex-direction: column;
        }
        .print-header {
          text-align: center;
          margin-bottom: 5px;
        }
        .print-header h2 {
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 1px;
          line-height: 1.2;
        }
        .print-header p {
          font-size: 11.5px;
          font-weight: bold;
          line-height: 1.2;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        col.col-staff { width: 11.5%; }
        col.col-day { width: 12.64%; }
        th, td {
          border: 1px solid #444;
          padding: 3px 4px;
          vertical-align: middle;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        th {
          background: #b8cce4 !important;
          text-align: center;
          font-weight: bold;
          font-size: 11px;
          line-height: 1.2;
          padding: 4px 4px;
        }
        th.date-row {
          background: #dce6f1 !important;
          font-weight: normal;
          font-size: 10px;
          padding: 2px 4px;
        }
        .dept-header td {
          background: #dce6f1 !important;
          font-weight: bold;
          text-align: left;
          font-size: 10.5px;
          padding: 3px 6px;
          line-height: 1.2;
        }
        .staff-name {
          font-weight: 700;
          font-size: 11px;
          text-align: left;
          padding-left: 6px;
          line-height: 1.25;
        }
        .day-cell {
          text-align: center;
          white-space: pre-wrap;
          font-size: 10.5px;
          line-height: 1.28;
          padding: 3px 4px;
        }
        .footer-section {
          margin-top: 6px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .footer-note {
          font-weight: bold;
          font-size: 10.5px;
          line-height: 1.3;
          white-space: pre-wrap;
          margin-bottom: 6px;
        }
        .footer-signatures {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-top: 4px;
          font-weight: bold;
          font-size: 11px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        .footer-signatures > div {
          width: 30%;
          text-align: center;
        }
        .signature-space {
          width: 100%;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 2px 0;
        }
        .signature-img {
          max-height: 46px;
          max-width: 150px;
          object-fit: contain;
        }
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm 6mm;
          }
          html, body {
            height: auto;
            overflow: visible;
          }
          .schedule-wrapper {
            padding: 0;
            page-break-after: avoid;
            page-break-before: avoid;
            break-inside: avoid;
          }
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
        return `<tr class="staff-row">
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
  <div id="pageRuler" style="position:absolute;top:0;left:0;width:285mm;height:192mm;visibility:hidden;pointer-events:none;z-index:-1;"></div>
  <div class="schedule-wrapper" id="scheduleWrapper">
    <div class="print-header">
      <h2>${title}</h2>
      <p>${dateRange}</p>
    </div>
    <table id="scheduleTable">
      <colgroup>
        <col class="col-staff" />
        <col class="col-day" />
        <col class="col-day" />
        <col class="col-day" />
        <col class="col-day" />
        <col class="col-day" />
        <col class="col-day" />
        <col class="col-day" />
      </colgroup>
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
    
    <div class="footer-section">
      ${weeklyNote ? `<div class="footer-note">Lưu ý:<br/>${weeklyNote.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</div>` : ''}
      
      <div class="footer-signatures">
        <div>Duyệt</div>
        <div>
          Người lập
          <div class="signature-space">
            ${creatorSignatureUrl ? `<img src="${creatorSignatureUrl}" class="signature-img" alt="Chữ ký người lập" />` : ''}
          </div>
          ${creatorName ? `<div>${creatorName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>` : ''}
        </div>
      </div>
    </div>
  </div>
  <script>
    function fitSinglePageAndPrint() {
      const wrapper = document.getElementById('scheduleWrapper');
      const ruler = document.getElementById('pageRuler');
      const staffRows = document.querySelectorAll('tr.staff-row');

      if (wrapper && ruler) {
        const targetWidth = ruler.offsetWidth || 1077;
        const maxPageHeight = ruler.offsetHeight || 725;

        // Cố định chiều rộng chuẩn khổ A4 ngang (285mm) khi đo để số dòng xuống hàng chính xác trên mọi màn hình (PC & Mobile)
        wrapper.style.width = targetWidth + 'px';
        wrapper.style.padding = '0';

        const currentHeight = wrapper.offsetHeight;

        if (currentHeight < maxPageHeight - 10 && staffRows.length > 0) {
          // Nếu còn dư khoảng trống trên trang 1 -> giãn đều chiều cao các dòng nhân viên để lấp đầy trang đẹp mắt
          const extraSpace = maxPageHeight - currentHeight - 10;
          const extraPerRow = Math.floor(extraSpace / staffRows.length);
          if (extraPerRow > 2) {
            staffRows.forEach(row => {
              const currentRowH = row.offsetHeight;
              const targetRowH = Math.min(72, currentRowH + extraPerRow);
              row.style.height = targetRowH + 'px';
            });
          }
        }

        // Kiểm tra lại sau khi giãn hoặc nếu nội dung dài vượt quá 1 trang -> tự thu phóng (zoom) để vừa khít 1 trang A4
        const finalHeight = wrapper.offsetHeight;
        if (finalHeight > maxPageHeight) {
          const scale = Math.max(0.62, (maxPageHeight / finalHeight) * 0.98);
          wrapper.style.zoom = String(scale);
        }

        wrapper.style.width = '100%';
      }

      setTimeout(() => {
        window.print();
      }, 100);
    }

    window.onload = () => {
      const imgs = Array.from(document.images);
      if (imgs.length === 0) {
        fitSinglePageAndPrint();
        return;
      }
      let loaded = 0;
      const checkDone = () => {
        loaded++;
        if (loaded >= imgs.length) {
          fitSinglePageAndPrint();
        }
      };
      imgs.forEach(img => {
        if (img.complete) {
          checkDone();
        } else {
          img.addEventListener('load', checkDone, { once: true });
          img.addEventListener('error', checkDone, { once: true });
        }
      });
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
