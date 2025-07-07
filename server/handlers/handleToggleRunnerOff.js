module.exports = async function handleToggleRunnerOff(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /toggle-runner-off triggered by:", user_name);
  res.send(`✅ /toggle-runner-off acknowledged. (TODO: Implement logic)`);
};