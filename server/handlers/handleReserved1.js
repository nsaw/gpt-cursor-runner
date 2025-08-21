module.exports = (req, res) => {
  res.json({
    response_type: "in_channel",
    text: "🔒 **Reserved Command**\n\nThis command is reserved for future use.\n\n**Command:** /reserved-1\n**Status:** Not implemented yet",
  });
};
