// Cooldown-based heartbeat watchdog — replaces cron
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");
const { exec } = require("child_process");
const cooldownFile = path.join(__dirname, "../../.watchdog-cooldown.lock");
let retryDelay = 60000;
let failCount = 0;
const MAX_DELAY = 1800000;

function triggerValidation() {
  if (fs.existsSync(cooldownFile))
    return console.log("⏸ Watchdog in cooldown");
  console.log("🔍 Triggering validation...");
  exec("node scripts/hooks/patch-validation-loop.js", (err, stdout, stderr) => {
    if (err) {
      console.error("❌ Validation failed");
      failCount++;
      retryDelay = Math.min(retryDelay * 2, MAX_DELAY);
      if (failCount >= 3)
        fs.writeFileSync(cooldownFile, "Cooldown active after 3 failures");
    } else {
      console.log("✅ Validation success");
      retryDelay = 60000;
      failCount = 0;
    }
    schedule();
  });
}

function schedule() {
  setTimeout(triggerValidation, retryDelay);
}
schedule();
