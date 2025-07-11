const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class RunnerController {
  constructor() {
    this.runnerProcess = null;
    this.isRunning = false;
    this.lastError = null;
    this.startTime = null;
  }

  async startRunner() {
    if (this.isRunning) {
      return { success: false, message: 'Runner is already running' };
    }

    try {
      const runnerPath = path.join(__dirname, '../../gpt_cursor_runner/main.py');
      
      // Check if runner file exists
      try {
        await fs.access(runnerPath);
      } catch (error) {
        return { success: false, message: 'Runner file not found' };
      }

      this.runnerProcess = spawn('python3', [runnerPath], {
        cwd: path.join(__dirname, '../..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          PYTHON_PORT: '5053'  // Use different port for Python runner
        }
      });

      this.isRunning = true;
      this.startTime = new Date();
      this.lastError = null;

      this.runnerProcess.stdout.on('data', (data) => {
        console.log(`Runner stdout: ${data}`);
      });

      this.runnerProcess.stderr.on('data', (data) => {
        console.error(`Runner stderr: ${data}`);
        this.lastError = data.toString();
      });

      this.runnerProcess.on('close', (code) => {
        console.log(`Runner process exited with code ${code}`);
        this.isRunning = false;
        this.runnerProcess = null;
      });

      this.runnerProcess.on('error', (error) => {
        console.error('Runner process error:', error);
        this.lastError = error.message;
        this.isRunning = false;
        this.runnerProcess = null;
      });

      return { success: true, message: 'Runner started successfully' };
    } catch (error) {
      this.lastError = error.message;
      return { success: false, message: `Failed to start runner: ${error.message}` };
    }
  }

  async stopRunner() {
    if (!this.isRunning || !this.runnerProcess) {
      return { success: false, message: 'Runner is not running' };
    }

    try {
      this.runnerProcess.kill('SIGTERM');
      
      // Give it a moment to gracefully shut down
      setTimeout(() => {
        if (this.runnerProcess && this.isRunning) {
          this.runnerProcess.kill('SIGKILL');
        }
      }, 5000);

      this.isRunning = false;
      return { success: true, message: 'Runner stopped successfully' };
    } catch (error) {
      this.lastError = error.message;
      return { success: false, message: `Failed to stop runner: ${error.message}` };
    }
  }

  async restartRunner() {
    const stopResult = await this.stopRunner();
    if (!stopResult.success) {
      return stopResult;
    }

    // Wait a moment before restarting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return await this.startRunner();
  }

  async killRunner() {
    if (!this.isRunning || !this.runnerProcess) {
      return { success: false, message: 'Runner is not running' };
    }

    try {
      this.runnerProcess.kill('SIGKILL');
      this.isRunning = false;
      return { success: true, message: 'Runner killed successfully' };
    } catch (error) {
      this.lastError = error.message;
      return { success: false, message: `Failed to kill runner: ${error.message}` };
    }
  }

  getRunnerStatus() {
    // Check if runner is actually active using port probe
    const isActuallyRunning = this.isRunnerActive();
    
    // Update our internal state if it doesn't match reality
    if (isActuallyRunning && !this.isRunning) {
      this.isRunning = true;
      this.startTime = this.startTime || new Date();
    } else if (!isActuallyRunning && this.isRunning) {
      this.isRunning = false;
      this.runnerProcess = null;
    }
    
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      lastError: this.lastError,
      pid: this.runnerProcess?.pid,
      portActive: isActuallyRunning
    };
  }

  async executeCommand(command) {
    return new Promise((resolve) => {
      exec(command, { cwd: path.join(__dirname, '../..') }, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: error.message, stderr });
        } else {
          resolve({ success: true, stdout, stderr });
        }
      });
    });
  }

  isRunnerActive() {
    const { execSync } = require('child_process');
    try {
      // Try lsof first
      const out = execSync('lsof -i :5053').toString();
      console.log('lsof output:', out);
      // Check for any Python process (case insensitive)
      if (out.toLowerCase().includes('python')) return true;
      // Also check for python3 process
      if (out.toLowerCase().includes('python3')) return true;
    } catch(e) {
      console.log('lsof error:', e.message);
      // Fallback: try netstat if lsof is not available
      try {
        const netstat = execSync('netstat -tlnp 2>/dev/null | grep :5053').toString();
        console.log('netstat output:', netstat);
        if (netstat.toLowerCase().includes('python')) return true;
      } catch(e2) {
        console.log('netstat error:', e2.message);
        // Final fallback: try ss command
        try {
          const ss = execSync('ss -tlnp 2>/dev/null | grep :5053').toString();
          console.log('ss output:', ss);
          if (ss.toLowerCase().includes('python')) return true;
        } catch(e3) {
          console.log('ss error:', e3.message);
        }
      }
    }
    return false;
  }

  async checkRunnerHealth() {
    try {
      // First check if our managed process is running
      if (this.runnerProcess && this.isRunning) {
        try {
          this.runnerProcess.kill(0);
          return { healthy: true, message: 'Runner process is healthy' };
        } catch (error) {
          // Process is dead, update state
          this.isRunning = false;
          this.runnerProcess = null;
        }
      }
      
      // Check for any Python runner processes on port 5053
      const { exec } = require('child_process');
      const checkProcess = () => {
        return new Promise((resolve) => {
          exec("lsof -i :5053 2>/dev/null | grep -i python || netstat -tlnp 2>/dev/null | grep :5053 | grep -i python || ss -tlnp 2>/dev/null | grep :5053 | grep -i python", (error, stdout, stderr) => {
            console.log('Process detection stdout:', stdout);
            console.log('Process detection stderr:', stderr);
            if (error) console.log('Process detection error:', error.message);
            if (error || !stdout.trim()) {
              resolve(false);
            } else {
              resolve(true);
            }
          });
        });
      };
      
      const isRunning = await checkProcess();
      if (isRunning) {
        // Update our state to reflect the running process
        this.isRunning = true;
        this.startTime = this.startTime || new Date();
        return { healthy: true, message: 'Runner process is healthy (detected externally)' };
      } else {
        return { healthy: false, message: 'Runner process is not running' };
      }
    } catch (error) {
      return { healthy: false, message: `Runner health check failed: ${error.message}` };
    }
  }
}

module.exports = new RunnerController(); 