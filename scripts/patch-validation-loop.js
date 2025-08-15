// GPT enforces all patch commit flows
const fs = require("fs");
module.exports = function validate(patchFile) {
  const contents = fs.readFileSync(patchFile, "utf8");
  if (!contents.includes("summaryFile"))
    throw new Error("Missing GPT enforcement");
  return true;
};
