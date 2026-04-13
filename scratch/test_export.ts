
import { DamageReportService } from './lib/services/damageReportService';
import { generateDailyReportExcel } from './lib/utils/excelGenerator.server';
import { formatDateDisplay } from './lib/utils/dateFormat';
import fs from 'fs';
import path from 'path';

async function testExport() {
  try {
    console.log('Starting test export...');
    const service = new DamageReportService();
    const date = new Date();
    const data = await service.getDailyReportData(date);
    
    console.log('Data fetched, summary:', data.summary);
    
    const sections = [
      {
        title: 'BÁO CÁO MỚI',
        headers: ['ID', 'Nội dung'],
        rows: [[1, 'Test']]
      }
    ];

    const buffer = await generateDailyReportExcel({
      title: 'TEST REPORT',
      date: formatDateDisplay(date),
      summary: data.summary,
      sections: sections
    });

    const outputPath = path.join(process.cwd(), 'test_export.xlsx');
    fs.writeFileSync(outputPath, buffer);
    const stats = fs.statSync(outputPath);
    console.log(`Export successful! File saved to ${outputPath}`);
    console.log(`File size: ${stats.size} bytes`);
  } catch (err) {
    console.error('Test export failed:', err);
  }
}

testExport();
