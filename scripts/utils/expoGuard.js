#!/usr/bin/env node

const { execSync } = require("child_process");

function expoGuard() {
  try {
    // Detect common Expo/Metro processes
    const patterns = [
      "expo start",
      "react-native start",
      "metro",
      "node .*metro.*",
    ];
    const ps = execSync("ps aux", { encoding: "utf8" });
    const found = patterns.some((p) => new RegExp(p, "i").test(ps));
    if (found) {
      console.error(
        "[expoGuard] Detected active Expo/Metro process; blocking summary-monitor to avoid port conflicts.",
      );
      process.exit(1);
    }
  } catch (_e) {
    // If detection fails, proceed without blocking
  }
}

module.exports = { expoGuard };
