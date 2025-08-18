declare const console: any;
// Add dual-write logic to mirror instruction and summary into .cursor-cache
import fs from "fs-extra";
import path from "path";

export function mirrorPatchToCache(patchPath: string) {
  const patchFile = path.basename(patchPath);
  const mirrorPath = `/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/phase-1/${patchFile}`;
  try {
    fs.copySync(patchPath, mirrorPath);
    console.log(`✅ Patch mirrored to .cursor-cache: ${mirrorPath}`);
  } catch (e) {
    console.error(
      `❌ Failed to mirror patch to cache: ${(e as Error).message}`,
    );
  }
}

export function mirrorSummaryToCache(summaryPath: string) {
  const file = path.basename(summaryPath);
  const target = `/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/${file}`;
  try {
    fs.copySync(summaryPath, target);
    console.log(`✅ Summary mirrored to .cursor-cache: ${target}`);
  } catch (e) {
    console.error(
      `❌ Failed to mirror summary to cache: ${(e as Error).message}`,
    );
  }
}

// Integrate into patch runner and ghost where summary/patch write occurs
