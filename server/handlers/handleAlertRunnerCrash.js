module.exports = async function handleAlertRunnerCrash(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /alert-runner-crash triggered by:", user_name);
  res.send(`✅ /alert-runner-crash acknowledged. (TODO: Implement logic)`);
};