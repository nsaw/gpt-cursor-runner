// Attempts to re-trigger summary logic if .md missing
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const patchId = process.argv[2];
if (!patchId) {
  console.error("Patch ID missing");
  process.exit(1);
}
const summaryPath = `/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/summary-${patchId}.md`;
if (fs.existsSync(summaryPath)) {
  console.log(`✅ Summary already exists for ${patchId}`);
  process.exit(0);
}

console.log(`🔁 Triggering validator for missing summary: ${patchId}`);
exec(`bash scripts/validate-runtime.sh ${patchId}`, (err, stdout, stderr) => {
  if (err) {
    console.error(`❌ Validation failed: ${err.message}`);
    process.exit(2);
  }
  console.log(`✅ Validation complete: ${stdout}`);
});
