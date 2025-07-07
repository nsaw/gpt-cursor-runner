module.exports = async function handleTheme(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /theme triggered by:", user_name);
  res.send(`✅ /theme acknowledged. (TODO: Implement logic)`);
};