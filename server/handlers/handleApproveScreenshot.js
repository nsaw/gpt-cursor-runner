module.exports = async function handleApproveScreenshot(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /approve-screenshot triggered by:", user_name);
  res.send(`✅ /approve-screenshot acknowledged. (TODO: Implement logic)`);
};