// Ghost Summary Validator (src-nextgen)
import fs from 'fs';
import path from 'path';

const zones = ['CYOPS', 'MAIN'];

function checkSummary(filePath: string, zone: string) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const patchPattern = /patch-v\d+\.\d+\.\d+\(P\d+\.\d+\.\d+\)_[a-zA-Z0-9-]+/;
    const idMatch = raw.match(patchPattern);
    if (!idMatch) return;
    const patchId = idMatch[0];
    const jsonPath = `/Users/sawyer/gitSync/.cursor-cache/${zone}/patches/.completed/${patchId}.json`;
    if (!fs.existsSync(jsonPath)) return;
    const summaryPass = raw.includes('✅') || raw.includes('PASS');
    console.log(`[SummaryValidator] ${zone} ${patchId} → ${summaryPass ? 'PASS' : 'FAIL'} summary`);
  } catch (error) {
    console.error(`[SummaryValidator] Error checking summary: ${error}`);
  }
}

export function startSummaryValidator() {
  zones.forEach(zone => {
    const dir = `/Users/sawyer/gitSync/.cursor-cache/${zone}/summaries/`;
    fs.watch(dir, (evt, file) => {
      if (file && file.endsWith('.md')) checkSummary(path.join(dir, file), zone);
    });
    console.log(`[SummaryValidator] Watching ${zone} summaries`);
  });
} 