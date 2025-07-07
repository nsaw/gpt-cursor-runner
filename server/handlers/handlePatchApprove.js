module.exports = async function handlePatchApprove(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /patch-approve triggered by:", user_name);
  res.send(`✅ /patch-approve acknowledged. (TODO: Implement logic)`);
};