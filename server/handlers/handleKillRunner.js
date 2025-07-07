module.exports = async function handleKillRunner(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /kill-runner triggered by:", user_name);
  res.send(`✅ /kill-runner acknowledged. (TODO: Implement logic)`);
};