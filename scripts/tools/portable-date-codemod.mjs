import { readFileSync, writeFileSync, chmodSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ROOT = process.env.ROOT;
const GLOBS = [
  "scripts/**/*.sh",
  "scripts/**/*.bash",
  "scripts/**/watchdogs/*.sh",
  "scripts/**/monitor/*.sh",
  "scripts/**/ops/*.sh",
];

// Collect candidate files with ripgrep or find (prefer find for portability)
const list = execSync(
  `cd "${ROOT}" && find scripts -type f \\( -name "*.sh" -o -name "*.bash" \\ )`,
  { stdio: ["ignore", "pipe", "ignore"] },
)
  .toString()
  .trim()
  .split("\n")
  .filter(Boolean);

const BAD = [
  /\bdate\s+-I\S*\b/g, // e.g., date -I, -Is, etc.
  /\bdate\s+--iso-8601[=\S]*\b/g, // GNU-ish
  /\bdate\s+-u\s*\+%Y-%m-%dT%H:%M:%S(?:\.\d+)?Z\b/g, // legacy direct format (replace with TS())
];

const ensureLoader = (body) => {
  if (body.includes("portable_ts.sh")) return body;
  // inject loader right after shebang if present; else at top
  const loader = `. "${ROOT}/scripts/lib/portable_ts.sh"\n`;
  if (body.startsWith("#!")) {
    const nl = body.indexOf("\n");
    if (nl > 0) return body.slice(0, nl + 1) + loader + body.slice(nl + 1);
  }
  return loader + body;
};

let patched = 0;
for (const rel of list) {
  const f = join(ROOT, rel);
  let b = readFileSync(f, "utf8");
  const before = b;
  // replace all bad date calls with $(TS)
  for (const rx of BAD) b = b.replace(rx, "$(TS)");
  // inject TS loader if we touched anything
  if (b !== before) {
    b = ensureLoader(b);
    writeFileSync(f, b);
    try {
      chmodSync(f, 0o755);
    } catch {}
    patched++;
    process.stdout.write(`patched: ${rel}\n`);
  }
}
process.stdout.write(`total_patched: ${patched}\n`);
