const fs = require("fs");
const base = "/Users/sawyer/gitSync/.cursor-cache";

["MAIN", "CYOPS"].forEach((agent) => {
  const root = `${base}/${agent}`;
  [
    "patches",
    "summaries",
    ".logs",
    ".heartbeat",
    ".completed",
    ".archive",
    ".failed",
  ].forEach((sub) => {
    fs.mkdirSync(`${root}/${sub}`, { recursive: true });
  });
  fs.writeFileSync(`${root}/README.md`, `# GHOST Unified Root for ${agent}`);
  fs.writeFileSync(`${root}/INDEX.md`, `## Patch Index for ${agent}`);
});
