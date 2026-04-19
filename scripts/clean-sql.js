const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../backups/backup-2026-04-19T14-08-06-194Z.sql');
const outputFile = path.join(__dirname, '../backups/backup-clean.sql');

console.log(`Cleaning ${inputFile}...`);
let content = fs.readFileSync(inputFile, 'utf8');

// Remove psql meta-commands (lines starting with \)
const lines = content.split('\n');
const cleanLines = lines.filter(line => {
  const trimmed = line.trim();
  return !trimmed.startsWith('\\'); // Remove \set, \connect, \restrict, etc.
});

fs.writeFileSync(outputFile, cleanLines.join('\n'));
console.log(`✅ Cleaned file saved to ${outputFile}`);
