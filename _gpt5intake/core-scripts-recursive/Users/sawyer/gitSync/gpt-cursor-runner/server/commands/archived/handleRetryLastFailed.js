const _patchManager = require("../utils/patchManager");

module.exports = async function handleRetryLastFailed(_req, _res) {
  const { _user_name } = req.body;
  console.log("⚡️ /retry-last-failed triggered by:", user_name);

  try {
    const _failedPatches = await patchManager.getFailedPatches();

    if (failedPatches.length === 0) {
      res.send(
        "✅ No failed patches found. All patches are successful or pending.",
      );
      return;
    }

    const _lastFailedPatch = failedPatches[failedPatches.length - 1];
    const _retryResult = await patchManager.retryFailedPatch(
      lastFailedPatch.id,
    );

    if (retryResult.success) {
      res.send(
        `🔄 *Retrying Last Failed Patch*\n\n*Patch ID:* \`${lastFailedPatch.id}\`\n*File:* ${lastFailedPatch.file || "Unknown"}\n*Description:* ${lastFailedPatch.description || "No description"}\n*Retry Count:* ${(lastFailedPatch.retryCount || 0) + 1}\n\nStatus: ${retryResult.message}`,
      );
    } else {
      res.send(`❌ Failed to retry patch: ${retryResult.message}`);
    }
  } catch (_error) {
    console.error("Error retrying failed patch:", error);
    res.send(`❌ Error retrying failed patch: ${error.message}`);
  }
};
