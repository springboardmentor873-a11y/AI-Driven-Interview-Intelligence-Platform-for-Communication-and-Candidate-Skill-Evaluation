const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'ui-files.json'), 'utf8'));
const backupDir = path.join(__dirname, '.module1-ui-original-backup');

manifest.uiFiles.forEach(f => {
  const norm = f.replace(/\\/g, '/');
  const content = execSync(`git show module1-ui-original:"${norm}"`, { cwd: ROOT_DIR });
  const dest = path.join(backupDir, norm);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
});

console.log(`Saved original backup copies for ${manifest.uiFiles.length} files.`);

