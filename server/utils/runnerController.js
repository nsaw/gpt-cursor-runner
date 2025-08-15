const { spawn, exec } = require("child_process");
const { execShell } = require("../../scripts/utils/runShell");
const path = require("path");
const fs = require("fs").promises;

class RunnerController {
  constructor() {
    this.runnerProcess = null;
    this.isRunning = false;
    this.lastError = null;
    this.startTime = null;
  }

  async startRunner() {
    if (this.isRunning) {
      return { success: false, message: "Runner is already running" };
    }

    try {
      const runnerPath = path.join(
        __dirname,
        "../../gpt_cursor_runner/main.py",
      );

      // Check if runner file exists
      try {
        await fs.access(runnerPath);
      } catch (error) {
        return { success: false, message: "Runner file not found" };
      }

      this.runnerProcess = spawn("python3", [runnerPath], {
        cwd: path.join(__dirname, "../.."),
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.isRunning = true;
      this.startTime = new Date();
      this.lastError = null;

      this.runnerProcess.stdout.on("data", (data) => {
        console.log(`Runner stdout: ${data}`);
      });

      this.runnerProcess.stderr.on("data", (data) => {
        console.error(`Runner stderr: ${data}`);
        this.lastError = data.toString();
      });

      this.runnerProcess.on("close", (code) => {
        console.log(`Runner process exited with code ${code}`);
        this.isRunning = false;
        this.runnerProcess = null;
      });

      this.runnerProcess.on("error", (error) => {
        console.error("Runner process error:", error);
        this.lastError = error.message;
        this.isRunning = false;
        this.runnerProcess = null;
      });

      return { success: true, message: "Runner started successfully" };
    } catch (error) {
      this.lastError = error.message;
      return {
        success: false,
        message: `Failed to start runner: ${error.message}`,
      };
    }
  }

  async stopRunner() {
    if (!this.isRunning || !this.runnerProcess) {
      return { success: false, message: "Runner is not running" };
    }

    try {
      this.runnerProcess.kill("SIGTERM");

      // Give it a moment to gracefully shut down
      setTimeout(() => {
        if (this.runnerProcess && this.isRunning) {
          this.runnerProcess.kill("SIGKILL");
        }
      }, 5000);

      this.isRunning = false;
      return { success: true, message: "Runner stopped successfully" };
    } catch (error) {
      this.lastError = error.message;
      return {
        success: false,
        message: `Failed to stop runner: ${error.message}`,
      };
    }
  }

  async restartRunner() {
    const stopResult = await this.stopRunner();
    if (!stopResult.success) {
      return stopResult;
    }

    // Wait a moment before restarting
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return await this.startRunner();
  }

  async killRunner() {
    if (!this.isRunning || !this.runnerProcess) {
      return { success: false, message: "Runner is not running" };
    }

    try {
      this.runnerProcess.kill("SIGKILL");
      this.isRunning = false;
      return { success: true, message: "Runner killed successfully" };
    } catch (error) {
      this.lastError = error.message;
      return {
        success: false,
        message: `Failed to kill runner: ${error.message}`,
      };
    }
  }

  getRunnerStatus() {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      lastError: this.lastError,
      pid: this.runnerProcess?.pid,
    };
  }

  async executeCommand(command) {
    try {
      const { stdout, stderr } = await execShell(command, {
        cwd: path.join(__dirname, "../.."),
        timeout: 60_000,
      });
      return { success: true, stdout, stderr };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stderr: String(error.stderr || ""),
      };
    }
  }

  async checkRunnerHealth() {
    try {
      // Check if runner process is still alive
      if (this.runnerProcess && this.isRunning) {
        // Send a test signal to check if process is responsive
        this.runnerProcess.kill(0);
        return { healthy: true, message: "Runner process is healthy" };
      } else {
        return { healthy: false, message: "Runner process is not running" };
      }
    } catch (error) {
      return {
        healthy: false,
        message: `Runner health check failed: ${error.message}`,
      };
    }
  }
}

module.exports = new RunnerController();
