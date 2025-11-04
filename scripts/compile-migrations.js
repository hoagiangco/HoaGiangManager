// Simple script runner for TypeScript migration files
// This compiles and runs TypeScript files using ts-node

const { execSync } = require('child_process');
const path = require('path');

const script = process.argv[2];

if (!script) {
  console.error('Usage: node compile-migrations.js <migrate|seed>');
  process.exit(1);
}

try {
  // Use tsx to run TypeScript files directly
  execSync(`npx tsx scripts/${script}.ts`, {
    stdio: 'inherit',
    cwd: process.cwd(),
  });
} catch (error) {
  console.error(`Error running ${script}:`, error.message);
  process.exit(1);
}

