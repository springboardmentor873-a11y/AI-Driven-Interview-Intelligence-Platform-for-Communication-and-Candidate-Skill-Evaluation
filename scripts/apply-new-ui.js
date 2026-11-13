const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'ui-files.json'), 'utf8'));
const newUiDir = path.join(__dirname, '.module1-ui-new');

manifest.uiFiles.forEach((relPath) => {
  const norm = relPath.replace(/\\/g, '/');
  const source = path.join(newUiDir, norm);
  const dest = path.join(ROOT_DIR, norm);
  if (fs.existsSync(source)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(source, dest);
  }
});

console.log('[apply-new-ui] Successfully applied new clean Module 1 UI.');

