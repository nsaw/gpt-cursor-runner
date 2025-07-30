// Diff Monitor for summary-patch-validator alignment
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { emitPatchComplete } from './relayCore';

export function startDiffMonitor() {
  const patchDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.completed';
  const summaryDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries';

  function hashFile(file: string) {
    const content = fs.readFileSync(file, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  function check() {
    try {
      const files = fs.readdirSync(summaryDir).filter(f => f.endsWith('.summary.md'));
      const latestSummary = files.sort((a, b) => fs.statSync(path.join(summaryDir, b)).mtimeMs - fs.statSync(path.join(summaryDir, a)).mtimeMs)[0];
      const patchId = latestSummary.replace('.summary.md', '')
      const patchPath = path.join(patchDir, patchId + '.json');
      const summaryPath = path.join(summaryDir, latestSummary);

      if (!fs.existsSync(patchPath)) return;

      const hash1 = hashFile(patchPath);
      const hash2 = hashFile(summaryPath);

      if (hash1 !== hash2) {
        console.warn(`[DiffMonitor] ⚠️ Summary mismatch: ${patchId}`);
        emitPatchComplete('DIFF_MISMATCH_' + patchId);
      } else {
        console.log(`[DiffMonitor] ✅ Summary/patch match: ${patchId}`);
      }
    } catch (error) {
      console.warn('[DiffMonitor] error:', error);
    }
  }

  setInterval(check, 90000); // every 90s
}