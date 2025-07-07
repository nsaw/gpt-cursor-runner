module.exports = async function handleStatus(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /status triggered by:", user_name);
  res.send(`✅ /status acknowledged. (TODO: Implement logic)`);
};