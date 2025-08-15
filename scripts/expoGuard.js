const { exec } = require("child_process");

function checkExpoProcesses() {
  return new Promise((resolve) => {
    // Check for actual Expo development servers on common ports
    exec(
      "lsof -i :8081 -i :19000 -i :19001 -i :19002",
      { encoding: "utf8" },
      (error, stdout, _stderr) => {
        if (error) {
          // No processes found on those ports
          resolve({ running: false, error: error.message });
        } else {
          const lines = stdout
            .trim()
            .split("\n")
            .filter((line) => line.length > 0);
          const expoDevServers = lines.filter(
            (line) =>
              line.includes("expo") ||
              line.includes("metro") ||
              (line.includes("node") &&
                (line.includes("start") || line.includes("serve"))),
          );
          resolve({
            running: expoDevServers.length > 0,
            output: expoDevServers.join("\n"),
            allProcesses: lines,
          });
        }
      },
    );
  });
}

async function expoGuard() {
  const result = await checkExpoProcesses();
  if (result.running) {
    console.log(
      "⚠️  Expo development server detected, blocking ghost runner startup",
    );
    console.log("Expo development servers found:", result.output);
    process.exit(1);
  }
  console.log(
    "✅ No Expo development servers detected, ghost runner can start",
  );
}

module.exports = { expoGuard };
