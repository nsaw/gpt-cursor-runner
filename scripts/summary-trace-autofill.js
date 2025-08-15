const fs = require("fs");
const path = require("path");

function safeLog(message) {
  try {
    console.log(message);
  } catch (_error) {
    // Silent fail for EPIPE or other stream errors
    try {
      fs.appendFileSync(
        "/Users/sawyer/gitSync/gpt-cursor-runner/logs/summary-trace.log",
        `[SAFE_LOG] ${new Date().toISOString()}: ${message}\n`,
      );
    } catch (logError) {}
  }
}

const summaryDir = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries";

safeLog("🔍 Starting summary trace autofill watcher...");

fs.watch(summaryDir, (event, file) => {
  if (file && file.endsWith(".md")) {
    const fullPath = path.join(summaryDir, file);

    fs.readFile(fullPath, "utf-8", (err, data) => {
      if (err) {
        safeLog(`❌ Error reading ${file}: ${err.message}`);
        return;
      }

      if (data.includes("patch-trace:")) {
        safeLog(`ℹ️ ${file} already has patch-trace, skipping`);
        return;
      }

      const patchId = file.replace("summary-", "").replace(".md", "");
      const trace = `\n\n---\n🔍 patch-trace: ${patchId} (autofilled)`;

      fs.appendFile(fullPath, trace, (err) => {
        if (err) {
          safeLog(`❌ Error autofilling trace for ${file}: ${err.message}`);
        } else {
          safeLog(`✅ Autofilled trace for ${file}`);
        }
      });
    });
  }
});

safeLog("✅ Summary trace autofill watcher active");
