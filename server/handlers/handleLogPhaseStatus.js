module.exports = async function handleLogPhaseStatus(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /log-phase-status triggered by:", user_name);
  res.send(`✅ /log-phase-status acknowledged. (TODO: Implement logic)`);
};