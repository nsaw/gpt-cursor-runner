import fs from "fs"; import { spawn } from "child_process";
const STEP_TIMEOUT = parseInt(process.env.STEP_TIMEOUT_MS||"30000",10);
function sh(nodeArgs){
  return new Promise((resolve)=>{
    const p = spawn("node", nodeArgs, { stdio:["ignore","pipe","pipe"] });
    let out=""; p.stdout.on("data",d=>out+=d.toString());
    p.on("close",(code)=>resolve({code, out:out.trim()}));
  });
}
(async function(){
  const sel = await sh(["/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/select_next_p1_once.mjs"]);
  if(sel.out==="NO_CANDIDATE" || !sel.out){ console.log("NO_CANDIDATE"); process.exit(0); }
  const target = sel.out;
  const ap = await sh(["/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/direct_apply_once.js", target]);
  console.log(ap.out||"DONE");
})();
