// generate-indexes.js: emit README + INDEX per ghost zone
const fs = require("fs");
const path = require("path");
const roots = ["MAIN", "CYOPS"];
const base = "/Users/sawyer/gitSync/.cursor-cache/";

roots.forEach((zone) => {
  const root = path.join(base, zone);
  const summaries = fs
    .readdirSync(path.join(root, "summaries"))
    .filter((f) => f.endsWith(".md"));
  const readme = `# ${zone} Patch Summaries\n\n## Active Patches (${summaries.length})\n\n- ${summaries.join("\n- ")}`;
  const index = summaries
    .map((name) => `- [${name}](./summaries/${name})`)
    .join("\n");
  fs.writeFileSync(path.join(root, "README.md"), readme);
  fs.writeFileSync(path.join(root, "INDEX.md"), `# Patch Index\n${index}`);
});
