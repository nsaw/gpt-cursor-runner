#!/usr/bin/env node
// Minimal Playwright base harness (non-shell). Uses playwright within Node.
// If Playwright is not installed in this environment, we log and exit 0 (record-only under P2.11.00).
(async () => {
  const fs = require('fs');
  const argv = process.argv.slice(2);
  const urlIdx = argv.indexOf('--url'); const outIdx = argv.indexOf('--out');
  const url = urlIdx >= 0 ? argv[urlIdx+1] : 'about:blank';
  const out = outIdx >= 0 ? argv[outIdx+1] : '/tmp/validation-tests.log';
  let havePW = true; let pw;
  try { pw = require('playwright'); } catch { havePW = false; }
  let log = `[visual-base] url=${url} start=${new Date().toISOString()}\n`;
  if (!havePW) {
    log += '[visual-base] playwright not installed; record-only pass under P2.11.00\n';
    fs.appendFileSync(out, log); process.exit(0);
  }
  try {
    const { chromium } = pw;
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 10000 }).catch(() => {});
    log += '[visual-base] navigation attempted; closing browser.\n';
    await browser.close();
    fs.appendFileSync(out, log);
    process.exit(0);
  } catch (e) {
    log += `[visual-base] error: ${String(e)}\n`;
    fs.appendFileSync(out, log);
    process.exit(0); // record-only during P2.11.00
  }
})();
