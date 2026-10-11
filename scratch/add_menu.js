const fs = require('fs');
const layoutPath = 'e:\\Web Project\\Nextjs\\HoaGiangManager\\app\\(dashboard)\\layout.tsx';
let content = fs.readFileSync(layoutPath, 'utf8');

const target = "{ href: '/dashboard/backup', label: 'Sao lưu/ Phục hồi', icon: 'fas fa-database' }";
const replacement = target + ",\n          { href: '/dashboard/audit-logs', label: 'Nhật ký thao tác', icon: 'fas fa-history' }";

if (content.includes(target) && !content.includes('/dashboard/audit-logs')) {
  content = content.replace(target, replacement);
  fs.writeFileSync(layoutPath, content, 'utf8');
  console.log('Added to layout.tsx');
} else {
  console.log('Failed to add to layout.tsx');
}
