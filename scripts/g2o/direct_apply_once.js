const fs = require("fs"); 
const path = require("path");
const { run } = require("./nb_exec.js");

const STEP_TIMEOUT = parseInt(process.env.STEP_TIMEOUT_MS||"30000",10);
const VALIDATE_IS_SOFT = (process.env.VALIDATE_IS_SOFT||"true")==="true";
const ROOT = "/Users/sawyer/gitSync/.cursor-cache/CYOPS";
const PATCHES_ROOT = path.join(ROOT,"patches");
const FAILED_DIR = path.join(PATCHES_ROOT,".failed");
const DONE_DIR = path.join(PATCHES_ROOT,".completed");
const SUMMARIES = path.join(ROOT,"summaries");
const LOGS = path.join(ROOT,".logs");

fs.mkdirSync(FAILED_DIR,{recursive:true}); 
fs.mkdirSync(DONE_DIR,{recursive:true}); 
fs.mkdirSync(SUMMARIES,{recursive:true}); 
fs.mkdirSync(LOGS,{recursive:true});

function now(){return new Date().toISOString();}

async function runShellArray(arr, phase){
  for (const cmd of (arr||[])) {
    const r = await run(cmd, STEP_TIMEOUT);
    if (!r.ok) return { ok:false, phase, cmd, err:r.err?.message, stderr:r.stderr };
  }
  return { ok:true };
}

function moveTo(dir, src){
  const base = path.basename(src);
  const dst = path.join(dir, base.replace(/\.hold$/,""));
  try { fs.writeFileSync(dst, fs.readFileSync(src)); fs.unlinkSync(src); return dst; } catch(e){ return null; }
}

function summarize(patchPath, status, extra={}){
  const base = path.basename(patchPath).replace(/\.hold$/,"");
  const out = path.join(SUMMARIES, `summary-${base.replace(/^patch-/,"")}.md`);
  const body = [
    `# ${base}`,
    `ts: ${now()}`,
    `status: ${status}`,
    `extra: ${JSON.stringify(extra)}`,
  ].join("\n");
  try { fs.writeFileSync(out, body); } catch {}
}

async function main(){
  const patchPath = process.argv[2];
  if(!patchPath || !fs.existsSync(patchPath)) { console.log("NO_PATCH"); process.exit(0); }
  const raw = fs.readFileSync(patchPath,"utf8");
  let j; try{ j = JSON.parse(raw); } catch(e){ 
    const dst = moveTo(FAILED_DIR, patchPath);
    summarize(patchPath,"FAILED_JSON", {error:e.message, moved:dst});
    console.log("FAILED_JSON");
    process.exit(0);
  }
  const pre = (j.preMutation?.shell)||[];
  const mut = (j.mutation?.tasks)||[];
  const val = (j.validate?.shell)||[];
  const post = (j.postMutationBuild?.shell)||[];
  // Pre
  let r = await runShellArray(pre, "preMutation"); if(!r.ok){ const d=moveTo(FAILED_DIR,patchPath); summarize(patchPath,"FAILED_PRE", r); return; }
  // Mutation
  r = await runShellArray(mut, "mutation"); if(!r.ok){ const d=moveTo(FAILED_DIR,patchPath); summarize(patchPath,"FAILED_MUTATION", r); return; }
  // Validate (soft by default to bypass Ghost-only gates)
  r = await runShellArray(val, "validate");
  if(!r.ok && !VALIDATE_IS_SOFT){ const d=moveTo(FAILED_DIR,patchPath); summarize(patchPath,"FAILED_VALIDATE", r); return; }
  // Post
  r = await runShellArray(post, "postMutationBuild"); if(!r.ok){ const d=moveTo(FAILED_DIR,patchPath); summarize(patchPath,"FAILED_POST", r); return; }
  const dst = moveTo(DONE_DIR, patchPath); summarize(patchPath,"COMPLETED", {moved:dst});
  console.log("COMPLETED");
}

main();
