#!/usr/bin/env node
const fs = require('fs'),
  path = require('path');

try {
  if (process.env.CI) {
    console.log('HOOK_ENFORCE: skip in CI');
    return;
  }

  const src = path.join(process.cwd(), 'scripts', 'nb2_precommit_guard.sh');
  const dst = path.join(process.cwd(), '.git', 'hooks', 'pre-commit');

  if (fs.existsSync(src)) {
    fs.cpSync(src, dst, { force: true });
    fs.chmodSync(dst, 0o755);
    console.log('HOOK_ENFORCE: pre-commit installed');
  } else {
    console.log('HOOK_ENFORCE: source missing, skipped');
  }
} catch (e) {
  console.error('HOOK_ENFORCE_ERR', e?.message || e);
  process.exit(1);
}
