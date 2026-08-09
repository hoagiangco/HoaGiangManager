const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, '.next', 'standalone');
const nextStaticDir = path.join(rootDir, '.next', 'static');
const targetNextStaticDir = path.join(standaloneDir, '.next', 'static');
const publicDir = path.join(rootDir, 'public');
const targetPublicDir = path.join(standaloneDir, 'public');
const envExampleFile = path.join(rootDir, '.env.example');
const targetEnvExample = path.join(standaloneDir, '.env.example');
const zipFile = path.join(rootDir, 'deploy.zip');

function copyDirSync(src, dest, filterFn) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (filterFn && !filterFn(srcPath, entry)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, filterFn);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('--- Packaging Standalone Build for VPS Deployment ---');

if (!fs.existsSync(standaloneDir)) {
  console.error('Error: .next/standalone folder not found! Please run "npm run build" first.');
  process.exit(1);
}

// 1. Copy .next/static -> .next/standalone/.next/static
console.log('1. Copying .next/static to .next/standalone/.next/static...');
copyDirSync(nextStaticDir, targetNextStaticDir);

// 2. Copy public -> .next/standalone/public (excluding uploads contents)
console.log('2. Copying public/ to .next/standalone/public/ (excluding uploads)...');
const uploadsSrcDir = path.join(publicDir, 'uploads');
copyDirSync(publicDir, targetPublicDir, (srcPath, entry) => {
  // Exclude contents of public/uploads, but keep directory structure and .gitkeep
  if (srcPath.startsWith(uploadsSrcDir)) {
    if (srcPath === uploadsSrcDir) return true;
    if (entry.name === '.gitkeep') return true;
    return false;
  }
  return true;
});

// Ensure target uploads dir exists with .gitkeep
const targetUploadsDir = path.join(targetPublicDir, 'uploads');
if (!fs.existsSync(targetUploadsDir)) {
  fs.mkdirSync(targetUploadsDir, { recursive: true });
}
fs.writeFileSync(path.join(targetUploadsDir, '.gitkeep'), '');

// 3. Copy .env.example if exists
if (fs.existsSync(envExampleFile)) {
  console.log('3. Copying .env.example to standalone folder...');
  fs.copyFileSync(envExampleFile, targetEnvExample);
}

// 4. Create deploy.zip
console.log('4. Compressing .next/standalone into deploy.zip...');
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

try {
  console.log('Creating deploy.zip using PowerShell Compress-Archive...');
  execSync(`powershell -Command "Compress-Archive -Path '${standaloneDir}\\*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });
  console.log('\n✅ Successfully created deploy.zip!');
  const stats = fs.statSync(zipFile);
  console.log(`File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);
} catch (err) {
  console.error('Failed to create zip:', err.message);
  process.exit(1);
}
