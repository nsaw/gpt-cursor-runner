// ghost validate path/to/file.md
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) {
  console.error('Usage: ghost validate path/to/summary.md');
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error(`[❌ FILE NOT FOUND] ${file}`);
  process.exit(2);
}

const content = fs.readFileSync(file, 'utf-8');
if (content.includes('✅') || content.includes('❌')) {
  console.log(`[✅ VALID SUMMARY] ${file}`);
} else {
  console.warn(`[⚠️ NO STATUS MARKERS] ${file}`);
} 