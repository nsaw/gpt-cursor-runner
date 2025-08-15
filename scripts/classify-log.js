const fs = require("fs");
const lines = fs.readFileSync("logs/audit.log", "utf-8").split("\n");
const out = lines.filter((l) => /fail|timeout|error/i.test(l));
fs.writeFileSync("logs/anomaly.log", out.join("\n"));
console.log("[ML] Anomaly log written");
