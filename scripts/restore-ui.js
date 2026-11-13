const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(__dirname, 'ui-files.json');
const BACKUP_DIR = path.join(__dirname, '.module1-ui-original-backup');

if (!fs.existsSync(MANIFEST_PATH)) {
  console.error(`[restore:ui] Manifest not found at ${MANIFEST_PATH}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const { baselineTag, uiFiles, protectedFiles } = manifest;

console.log('====================================================');
console.log(`SmartHire AI - Module 1 UI Restore`);
console.log(`Baseline Tag: ${baselineTag}`);
console.log('====================================================');

// Verify baseline tag exists in Git
let tagAvailable = false;
try {
  execSync(`git rev-parse --verify ${baselineTag}`, { cwd: ROOT_DIR, stdio: 'pipe' });
  tagAvailable = true;
} catch (e) {
  console.warn(`[restore:ui] Warning: Git tag ${baselineTag} could not be verified directly through git.`);
}

let restoredCount = 0;
let errors = [];

for (const relPath of uiFiles) {
  const normRelPath = relPath.replace(/\\/g, '/');
  
  // Guard check: ensure we never touch protected files
  if (protectedFiles && protectedFiles.some(pf => normRelPath === pf || normRelPath.startsWith(pf + '/'))) {
    console.warn(`[restore:ui] Skipped protected file: ${relPath}`);
    continue;
  }

  const targetPath = path.join(ROOT_DIR, relPath);
  let content = null;

  // 1. Try reading from git tag baseline
  if (tagAvailable) {
    try {
      content = execSync(`git show ${baselineTag}:"${normRelPath}"`, {
        cwd: ROOT_DIR,
        encoding: 'buffer',
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (err) {
      // Failed to retrieve via git show
    }
  }

  // 2. Fallback to backup directory if needed
  if (!content) {
    const backupFilePath = path.join(BACKUP_DIR, relPath);
    if (fs.existsSync(backupFilePath)) {
      content = fs.readFileSync(backupFilePath);
    }
  }

  if (content !== null) {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content);
    restoredCount++;
    console.log(`  ✓ Restored: ${normRelPath}`);
  } else {
    errors.push(relPath);
    console.error(`  ✗ Failed to restore: ${normRelPath}`);
  }
}

console.log('----------------------------------------------------');
if (errors.length === 0) {
  console.log(`[restore:ui] SUCCESS! Restored all ${restoredCount} original UI files.`);
  console.log('[restore:ui] Firebase configs, auth logic, and services were preserved intact.');
} else {
  console.error(`[restore:ui] Completed with ${errors.length} error(s).`);
  process.exit(1);
}

