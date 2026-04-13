import { generateDailyReportExcel } from '../lib/utils/excelGenerator.server';
import fs from 'fs';
import path from 'path';

async function test() {
  try {
    const buffer = await generateDailyReportExcel({
      title: 'TEST REPORT',
      date: '14-04-2026',
      summary: { totalNew: 1, totalCompleted: 2, totalPending: 3 },
      sections: [
        {
          title: 'Section 1',
          headers: ['A', 'B', 'C', 'D', 'E', 'F'],
          rows: [['1', '2', '3', '4', '5', '6']]
        }
      ]
    });
    
    fs.writeFileSync(path.join(__dirname, 'test.xlsx'), buffer);
    console.log('Success! Wrote test.xlsx, size:', buffer.length);
  } catch (err) {
    console.error('Failed:', err);
  }
}
test();
