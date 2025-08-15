const _stateManager = require("../utils/stateManager");

module.exports = async function handleLockRunner(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /lock-runner triggered by:", user_name);

  try {
    const currentState = await stateManager.getState();

    if (currentState.lockdown) {
      res.send("🔒 Runner is already locked. Use `/unlock-runner` to unlock.");
      return;
    }

    await stateManager.lockRunner();

    res.send(
      `🔒 *Runner Locked*\n\nRunner has been locked by ${user_name}. No patches will be processed until unlocked with \`/unlock-runner\`.`,
    );
  } catch (error) {
    console.error("Error locking runner:", error);
    res.send(`❌ Error locking runner: ${error.message}`);
  }
};
