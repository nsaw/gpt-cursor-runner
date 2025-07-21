const fs = require('fs/promises');
(async () => {
  const files = await fs.readdir('tasks/queue');
  for (const file of files) {
    try {
      const patch = require(`../${file}`);
      await applyPatch(patch);
    } catch (e) {
      console.error(`[FAIL] Patch ${file}`, e);
    }
  }
})(); 