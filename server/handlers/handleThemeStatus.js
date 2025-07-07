module.exports = async function handleThemeStatus(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /theme-status triggered by:", user_name);
  res.send(`✅ /theme-status acknowledged. (TODO: Implement logic)`);
};