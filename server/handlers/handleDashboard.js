module.exports = async function handleDashboard(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /dashboard triggered by:", user_name);
  res.send(`✅ /dashboard acknowledged. (TODO: Implement logic)`);
};