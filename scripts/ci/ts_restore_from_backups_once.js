/* eslint-disable */
const fs = require('fs');
const path = require('path');

const ROOT = "/Users/sawyer/gitSync/gpt-cursor-runner";
const BACKUP_DIR = "/Users/sawyer/gitSync/gpt-cursor-runner/backups/targeted-fix";
const RESTORE_REPORT = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/ts-restore-report.json";

(() => {
  console.log("TS_RESTORE: Checking for files to restore from backups...");
  
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log("No backup directory found, skipping restore");
    process.exit(0);
  }
  
  const backupFiles = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.bak'));
  const restored = [];
  
  for (const backupFile of backupFiles) {
    const originalFile = backupFile.replace('.bak', '');
    const originalPath = path.join(ROOT, originalFile);
    const backupPath = path.join(BACKUP_DIR, backupFile);
    
    if (fs.existsSync(originalPath)) {
      const originalContent = fs.readFileSync(originalPath, 'utf8');
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      
      if (originalContent !== backupContent) {
        console.log(`Restoring ${originalFile} from backup...`);
        fs.copyFileSync(backupPath, originalPath);
        restored.push({
          file: originalFile,
          restored: true,
          reason: "content_differed"
        });
      }
    } else {
      console.log(`Restoring missing file ${originalFile} from backup...`);
      fs.copyFileSync(backupPath, originalPath);
      restored.push({
        file: originalFile,
        restored: true,
        reason: "file_missing"
      });
    }
  }
  
  // Write restore report
  const report = {
    timestamp: new Date().toISOString(),
    backup_dir: BACKUP_DIR,
    files_checked: backupFiles.length,
    files_restored: restored.length,
    restored_files: restored
  };
  
  fs.mkdirSync(path.dirname(RESTORE_REPORT), { recursive: true });
  fs.writeFileSync(RESTORE_REPORT, JSON.stringify(report, null, 2));
  
  console.log(`TS_RESTORE_COMPLETE: Checked ${backupFiles.length} backups, restored ${restored.length} files`);
  process.exit(0);
})();
