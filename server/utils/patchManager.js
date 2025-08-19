const fs = require("fs").promises;
const path = require("path");

class PatchManager {
  constructor() {
    this.patchesDir = path.join(__dirname, "../../patches");
    this.patchLogFile = path.join(__dirname, "../../patch-log.json");
    this.cursorPatchLogFile = path.join(
      __dirname,
      "../../.cursor-patch-log.json",
    );
  }

  async getPatchLog() {
    try {
      const data = await fs.readFile(this.patchLogFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async savePatchLog(log) {
    await fs.writeFile(this.patchLogFile, JSON.stringify(log, null, 2));
  }

  async getCursorPatchLog() {
    try {
      const data = await fs.readFile(this.cursorPatchLogFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async saveCursorPatchLog(log) {
    await fs.writeFile(this.cursorPatchLogFile, JSON.stringify(log, null, 2));
  }

  async getLastPatch() {
    const patchLog = await this.getPatchLog();
    return patchLog.length > 0 ? patchLog[patchLog.length - 1] : null;
  }

  async getPendingPatches() {
    const patchLog = await this.getPatchLog();
    return patchLog.filter((patch) => patch.status === "pending");
  }

  async approvePatch(patchId) {
    const patchLog = await this.getPatchLog();
    const patchIndex = patchLog.findIndex((patch) => patch.id === patchId);

    if (patchIndex === -1) {
      return { success: false, message: "Patch not found" };
    }

    patchLog[patchIndex].status = "approved";
    patchLog[patchIndex].approvedAt = new Date().toISOString();
    patchLog[patchIndex].approvedBy = "slack-command";

    await this.savePatchLog(patchLog);
    return { success: true, message: "Patch approved successfully" };
  }

  async revertPatch(patchId) {
    const patchLog = await this.getPatchLog();
    const patchIndex = patchLog.findIndex((patch) => patch.id === patchId);

    if (patchIndex === -1) {
      return { success: false, message: "Patch not found" };
    }

    patchLog[patchIndex].status = "reverted";
    patchLog[patchIndex].revertedAt = new Date().toISOString();
    patchLog[patchIndex].revertedBy = "slack-command";

    await this.savePatchLog(patchLog);
    return { success: true, message: "Patch reverted successfully" };
  }

  async getPatchPreview(patchId) {
    const patchLog = await this.getPatchLog();
    const patch = patchLog.find((patch) => patch.id === patchId);

    if (!patch) {
      return { success: false, message: "Patch not found" };
    }

    return {
      success: true,
      patch: {
        id: patch.id,
        file: patch.file,
        changes: patch.changes,
        status: patch.status,
        createdAt: patch.createdAt,
        description: patch.description,
      },
    };
  }

  async getPatchStats() {
    const patchLog = await this.getPatchLog();
    const total = patchLog.length;
    const approved = patchLog.filter((p) => p.status === "approved").length;
    const reverted = patchLog.filter((p) => p.status === "reverted").length;
    const pending = patchLog.filter((p) => p.status === "pending").length;
    const failed = patchLog.filter((p) => p.status === "failed").length;

    return {
      total,
      approved,
      reverted,
      pending,
      failed,
      successRate: total > 0 ? ((approved / total) * 100).toFixed(1) : 0,
    };
  }

  async listPatches(limit = 10) {
    const patchLog = await this.getPatchLog();
    return patchLog.slice(-limit).reverse();
  }

  async getFailedPatches() {
    const patchLog = await this.getPatchLog();
    return patchLog.filter((patch) => patch.status === "failed");
  }

  async retryFailedPatch(patchId) {
    const patchLog = await this.getPatchLog();
    const patchIndex = patchLog.findIndex((patch) => patch.id === patchId);

    if (patchIndex === -1) {
      return { success: false, message: "Patch not found" };
    }

    if (patchLog[patchIndex].status !== "failed") {
      return { success: false, message: "Patch is not in failed status" };
    }

    patchLog[patchIndex].status = "pending";
    patchLog[patchIndex].retryCount =
      (patchLog[patchIndex].retryCount || 0) + 1;
    patchLog[patchIndex].retriedAt = new Date().toISOString();

    await this.savePatchLog(patchLog);
    return { success: true, message: "Patch queued for retry" };
  }
}

module.exports = new PatchManager();
