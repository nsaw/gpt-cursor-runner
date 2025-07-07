module.exports = async function handleCursorMode(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /cursor-mode triggered by:", user_name);
  res.send(`✅ /cursor-mode acknowledged. (TODO: Implement logic)`);
};