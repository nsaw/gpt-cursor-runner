module.exports = async function runner(filePath) {
  console.log(`[RUNNER] Processing ${filePath}`);
  // Simulate some processing time
  await new Promise(resolve => setTimeout(resolve, 100));
  return true;
}; 