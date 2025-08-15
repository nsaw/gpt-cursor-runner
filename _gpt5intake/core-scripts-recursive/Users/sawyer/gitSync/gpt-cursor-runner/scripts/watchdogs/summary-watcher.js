const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

const SUM_DIR = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries";
const TARGET_FILE =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/summary_targets.txt";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function targets() {
  return fs
    .readFileSync(TARGET_FILE, "utf-8")
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

fs.watch(SUM_DIR, (e, f) => {
  if (e !== "rename" || !f.endsWith(".md")) return;

  // Ignore INDEX.md and README.md files
  if (f === "INDEX.md" || f === "README.md") {
    console.log("[SUM→CHAT] Ignoring", f, "- INDEX/README file");
    return;
  }

  const p = path.join(SUM_DIR, f);
  setTimeout(() => {
    if (!fs.existsSync(p)) return;

    const md = fs.readFileSync(p, "utf-8").slice(0, 6000);
    const msg = "```summary\n" + md + "\n```";

    targets().forEach((id) => {
      // Ensure thread ID has proper prefix
      const threadId = id.startsWith("thread_") ? id : `thread_${id}`;

      openai.beta.threads.messages
        .create(threadId, { role: "assistant", content: msg })
        .then(() => console.log("[SUM→CHAT]", f, "→", threadId))
        .catch((err) => console.error("[SUM→CHAT]", err.message));
    });
  }, 500);
});

console.log("[SUM→CHAT] watcher running");
