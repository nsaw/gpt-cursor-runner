const fs = require('fs/promises');

module.exports = async function writeLog(file, line) {
  await fs.appendFile(file, `${line}\n`);
}; 