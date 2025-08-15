/* ⬅️ PATCHED: path default moved to .cursor-cache/CYOPS/.heartbeat */
// CLI tool to display current .heartbeat/ state
const fs = require("fs");
const path = require("path");

const baseDir =
  process.argv[2] || "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat/";

try {
  const files = fs.readdirSync(baseDir);
  files.forEach((f) => {
    const p = path.join(baseDir, f);
    if (f.endsWith(".json")) {
      console.log(`\n--- ${f} ---`);
      const data = fs.readFileSync(p, "utf-8");
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    }
  });
} catch (_err) {
  console.error(`[ghost-status] Failed to read heartbeat dir: ${err.message}`);
  process.exit(1);
}
