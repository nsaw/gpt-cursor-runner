// logRouter.ts — daemon to parse validator + diff logs
import fs from 'fs';
import path from 'path';

const validatorDir = path.resolve('logs/validator');
const diffDir = path.resolve('logs/diff');

export function startLogRouter() {
  [validatorDir, diffDir].forEach(dir => {
    fs.watch(dir, (event, filename) => {
      if (filename) {
        const filePath = path.join(dir, filename);
        fs.readFile(filePath, 'utf8', (err, data) => {
          if (!err) {
            console.log(`[LogRouter] Parsed ${filename} →\n${data.slice(0, 200)}...`);
            // future: send to GPT/Ghost summary endpoint
          }
        });
      }
    });
  });
  console.log('[LogRouter] Diff + validator log router active.');
} 