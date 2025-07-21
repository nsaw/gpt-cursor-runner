const fs = require('fs').promises;
const path = require('path');

class StateManager {
  constructor() {
    this.stateFile = path.join(__dirname, '../../runner.state.json');
    this.state = null;
  }

  async loadState() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      this.state = JSON.parse(data);
      return this.state;
    } catch (error) {
      console.error('Error loading state:', error);
      // Initialize default state if file doesn't exist
      this.state = {
        paused: false,
        autoMode: true,
        lastPatch: null,
        lockdown: false,
        retryQueue: [],
        lastThemeAudit: null,
        crashFence: false,
        public_url: process.env.PUBLIC_URL || 'https://runner.thoughtmarks.app',
        slack_tokens: {
          access_token: process.env.SLACK_ACCESS_TOKEN || '',
          refresh_token: process.env.SLACK_REFRESH_TOKEN || '',
          public_url: process.env.PUBLIC_URL || 'https://runner.thoughtmarks.app'
        }
      };
      await this.saveState();
      return this.state;
    }
  }

  async saveState() {
    try {
      await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
      return true;
    } catch (error) {
      console.error('Error saving state:', error);
      return false;
    }
  }

  async getState() {
    if (!this.state) {
      await this.loadState();
    }
    return this.state;
  }

  async updateState(updates) {
    await this.getState();
    this.state = { ...this.state, ...updates };
    return await this.saveState();
  }

  // Runner control methods
  async pauseRunner() {
    return await this.updateState({ paused: true });
  }

  async resumeRunner() {
    return await this.updateState({ paused: false });
  }

  async toggleAutoMode() {
    const state = await this.getState();
    return await this.updateState({ autoMode: !state.autoMode });
  }

  async setAutoMode(enabled) {
    return await this.updateState({ autoMode: enabled });
  }

  async lockRunner() {
    return await this.updateState({ lockdown: true });
  }

  async unlockRunner() {
    return await this.updateState({ lockdown: false });
  }

  async setCrashFence(enabled) {
    return await this.updateState({ crashFence: enabled });
  }

  async updateLastPatch(patchInfo) {
    return await this.updateState({ lastPatch: patchInfo });
  }

  async addToRetryQueue(item) {
    const state = await this.getState();
    const retryQueue = [...state.retryQueue, item];
    return await this.updateState({ retryQueue });
  }

  async clearRetryQueue() {
    return await this.updateState({ retryQueue: [] });
  }

  async updateThemeAudit(auditInfo) {
    return await this.updateState({ lastThemeAudit: auditInfo });
  }

  // Status methods
  async getRunnerStatus() {
    const state = await this.getState();
    return {
      paused: state.paused,
      autoMode: state.autoMode,
      lockdown: state.lockdown,
      crashFence: state.crashFence,
      lastPatch: state.lastPatch,
      retryQueueLength: state.retryQueue.length,
      lastThemeAudit: state.lastThemeAudit,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  async getThemeStatus() {
    const state = await this.getState();
    return {
      lastThemeAudit: state.lastThemeAudit,
      themeIssues: state.lastThemeAudit?.issues || [],
      needsFix: state.lastThemeAudit?.needsFix || false
    };
  }

  async getRoadmap() {
    // This would typically fetch from a roadmap file or API
    return {
      currentPhase: 'Phase 2: Enhanced Automation',
      nextPhase: 'Phase 3: Advanced Analytics',
      completedPhases: ['Phase 1: Basic Runner'],
      milestones: [
        '✅ Slack integration complete',
        '✅ Basic patch processing',
        '🔄 Advanced error handling',
        '⏳ Real-time monitoring',
        '⏳ Predictive analytics'
      ]
    };
  }
}

module.exports = new StateManager(); 