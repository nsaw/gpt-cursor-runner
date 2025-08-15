const { exec } = require("child_process");

async function testProcessCheck() {
  console.log("Testing process checks...");

  const processes = [
    "patch_executor_daemon.py",
    "dashboard_daemon.py",
    "summary_watcher_daemon.py",
  ];

  for (const process of processes) {
    try {
      const result = await new Promise((resolve, reject) => {
        exec(`pgrep -f "${process}"`, { timeout: 5000 }, (error, stdout) => {
          if (error) {
            resolve({ running: false, error: error.message });
          } else {
            resolve({
              running: stdout.trim().length > 0,
              output: stdout.trim(),
            });
          }
        });
      });

      console.log(
        `${process}: ${result.running ? "RUNNING" : "STOPPED"} (${result.output || "no output"})`,
      );
    } catch (error) {
      console.log(`${process}: ERROR - ${error.message}`);
    }
  }
}

testProcessCheck();
