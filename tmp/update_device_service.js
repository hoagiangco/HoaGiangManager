const fs = require('fs');
const file = 'e:/Web Project/Nextjs/HoaGiangManager/lib/services/deviceService.ts';
let content = fs.readFileSync(file, 'utf8');

// Regex for select fields
const selectRegex = /dc\."Name" as "deviceCategoryName",\r?\n\s+CAST\(d\."Status"::text AS INTEGER\) as status/g;
const newSelect = 'dc."Name" as "deviceCategoryName",\n          CAST(d."Status"::text AS INTEGER) as status,\n          lr."lastReportStatus",\n          lr."lastReportContent",\n          lr."lastReportId"';

// Regex for joins (avoid duplicating if already there)
const joinRegex = /INNER JOIN "Department" dep ON d\."DepartmentID" = dep\."ID"(\r?\n\s+LEFT JOIN LATERAL \([\s\S]+?\) lr ON TRUE)?/g;
const newJoin = 'INNER JOIN "Department" dep ON d."DepartmentID" = dep."ID"\n        LEFT JOIN LATERAL (\n          SELECT \n            CAST(dr."Status"::text AS INTEGER) as "lastReportStatus",\n            dr."DamageContent" as "lastReportContent",\n            dr."ID" as "lastReportId"\n          FROM "DamageReport" dr\n          WHERE dr."DeviceID" = d."ID"\n          ORDER BY dr."ReportDate" DESC, dr."ID" DESC\n          LIMIT 1\n        ) lr ON TRUE';

content = content.replace(selectRegex, newSelect);
content = content.replace(joinRegex, newJoin);

fs.writeFileSync(file, content);
console.log('Update complete');
console.log('Matches for select:', (content.match(new RegExp('lastReportStatus', 'g')) || []).length);
