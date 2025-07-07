module.exports = async function handlePatchRevert(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /patch-revert triggered by:", user_name);
  res.send(`✅ /patch-revert acknowledged. (TODO: Implement logic)`);
};