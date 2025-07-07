module.exports = async function handlePatchPreview(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /patch-preview triggered by:", user_name);
  res.send(`✅ /patch-preview acknowledged. (TODO: Implement logic)`);
};