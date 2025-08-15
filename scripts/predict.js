const fs = require("fs");
const lines = fs.readFileSync("logs/anomaly.log", "utf-8").split("\n");
const counts = {};
lines.forEach((line) => {
  const key = /timeout/.test(line)
    ? "timeout"
    : /fail/.test(line)
      ? "fail"
      : "other";
  counts[key] = (counts[key] || 0) + 1;
});
fs.writeFileSync("analytics/predict.json", JSON.stringify(counts, null, 2));
