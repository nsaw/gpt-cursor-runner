// CLI tool to check ✅ or ❌ in summary file
const fs = require("fs");
const path = require("path");

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node validate-summary.js <path-to-summary.md>");
  process.exit(1);
}

try {
  const content = fs.readFileSync(filePath, "utf8");
  if (content.includes("✅")) process.exit(0);
  else if (content.includes("❌")) process.exit(1);
  else {
    console.error("No status marker found");
    process.exit(2);
  }
} catch (_err) {
  console.error(`Failed to read ${filePath}:`, err.message);
  process.exit(3);
}
