module.exports = async function handleWhoami(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /whoami triggered by:", user_name);
  res.send(`✅ /whoami acknowledged. (TODO: Implement logic)`);
};