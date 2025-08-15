// Creates an Express server at :7474/ghost
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 7474;
const CACHE_PATH = "/Users/sawyer/gitSync/.cursor-cache";

app.get("/ghost", async (req, res) => {
  const cyopsStatus = tryRead(
    path.join(CACHE_PATH, "CYOPS/.logs/ghost-relay.log"),
  );
  const mainStatus = tryRead(
    path.join(CACHE_PATH, "MAIN/.logs/ghost-relay.log"),
  );

  let diffTable = "";
  try {
    const basePath = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/";
    const summaries = fs
      .readdirSync(basePath)
      .filter((f) => f.endsWith("_diff-summary.json"));
    if (summaries.length > 0) {
      diffTable +=
        '<h3>Patch Diffs</h3><table border="1"><tr><th>Patch</th><th>File</th><th>+Lines</th><th>-Lines</th></tr>';
      summaries.forEach((file) => {
        const json = JSON.parse(
          fs.readFileSync(path.join(basePath, file), "utf-8"),
        );
        const rows = json.diffPreview
          .map(
            (d) =>
              `<tr><td>${json.patchId}</td><td>${d.file}</td><td style="color:green">+${d.added}</td><td style="color:red">-${d.removed}</td></tr>`,
          )
          .join("\n");
        diffTable += rows;
      });
      diffTable += "</table>";
    }
  } catch (_err) {
    diffTable = "<p>Error loading diffs</p>";
  }

  // Add Fly.io status monitoring
  const flyLogPath = path.join(__dirname, "../../logs/fly-status.log");
  let flyLogTail = "";
  try {
    const lines = fs
      .readFileSync(flyLogPath, "utf-8")
      .split("\n")
      .slice(-10)
      .join("<br>");
    flyLogTail = `<h3>Fly.io Status</h3><pre>${lines}</pre>`;
  } catch (_e) {
    flyLogTail = "<p>Fly log unavailable</p>";
  }

  res.send(`<pre><h2>GHOST STATUS</h2>

=== CYOPS ===
${cyopsStatus}

=== MAIN ===
${mainStatus}</pre>

${diffTable}

${flyLogTail}`);
});

function tryRead(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch (_error) {
    return "[Unavailable]";
  }
}

app.listen(PORT, () =>
  console.log(`[LIVE] Ghost monitor running on http://localhost:${PORT}/ghost`),
);
