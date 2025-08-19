/* eslint-disable @typescript-eslint/no-explicit-any, require-await, @typescript-eslint/no-unused-vars */
#!/usr/bin/env node
// shebang_guard_check_once.js — read-only; no auto-fix
const fs = require('fs'), path = require('path');
const files = process.argv.slice(2);
if (!files.length) { console.error("Usage: shebang_guard_check_once.js <file...>"); process.exit(2); }
let bad = [];
for (const f of files) {
  const buf = fs.readFileSync(f);
  let txt = buf.toString('utf8');
  // Strip BOM if present
  if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
  const firstLine = txt.split(/\r?\n/, 1)[0] || "";
  const leadingChunk = txt.slice(0, Math.min(80, txt.length));
  const ok = firstLine.startsWith("#!/usr/bin/env node");
  // fail if eslint-disable banner or any non-whitespace precedes the shebang
  const hasLeadingBanner = /^\s*\/\*\s*eslint-disable\b/.test(leadingChunk);
  const hasAnyLead = /^\s*(?:\/\*|\*)/.test(leadingChunk) || (!ok && /^\s*#\!/.test(leadingChunk) === false);
  if (!ok || hasLeadingBanner || hasAnyLead) {
    bad.push({ file: f, firstLine, leadingPreview: leadingChunk });
  }
}
if (bad.length) {
  console.log(JSON.stringify({ ok: false, violations: bad }, null, 2));
  process.exit(1);
} else {
  console.log(JSON.stringify({ ok: true, checked: files.length }, null, 2));
  process.exit(0);
}
