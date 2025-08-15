#!/usr/bin/env node

/**
 * Ping Ghost Verification Script
 * Triggers ghost verification to test queue processing and summary writeback
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("🔍 Pinging ghost verification...");

try {
  // Execute the ghost verification ping script
  const pingScript = path.join(
    __dirname,
    "..",
    "watchers",
    "ghost-verification-ping.sh",
  );

  if (fs.existsSync(pingScript)) {
    execSync(`bash ${pingScript}`, { stdio: "inherit" });
    console.log("✅ Ghost verification ping executed successfully");
  } else {
    console.error("❌ Ghost verification ping script not found");
    process.exit(1);
  }

  // Check if the verification log was created
  const verificationLog = path.join(
    __dirname,
    "..",
    "..",
    "summaries",
    "_ghost-verification.log",
  );

  if (fs.existsSync(verificationLog)) {
    const content = fs.readFileSync(verificationLog, "utf8");
    console.log("✅ Ghost verification log created:", content.trim());
  } else {
    console.error("❌ Ghost verification log not found");
    process.exit(1);
  }
} catch (_error) {
  console.error("❌ Ghost verification ping failed:", error.message);
  process.exit(1);
}
