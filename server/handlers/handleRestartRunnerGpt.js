module.exports = async function handleRestartRunnerGpt(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /restart-runner-gpt triggered by:", user_name);
  res.send(`✅ /restart-runner-gpt acknowledged. (TODO: Implement logic)`);
};