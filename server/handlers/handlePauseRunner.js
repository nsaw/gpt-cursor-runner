module.exports = async function handlePauseRunner(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /pause-runner triggered by:", user_name);
  res.send(`✅ /pause-runner acknowledged. (TODO: Implement logic)`);
};