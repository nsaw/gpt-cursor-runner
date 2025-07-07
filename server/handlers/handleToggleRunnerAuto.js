module.exports = async function handleToggleRunnerAuto(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /toggle-runner-auto triggered by:", user_name);
  res.send(`✅ /toggle-runner-auto acknowledged. (TODO: Implement logic)`);
};