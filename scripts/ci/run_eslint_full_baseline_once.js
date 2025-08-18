/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env node
(async () => {
  const fs=require('fs'), path=require('path'), Module=require('module');
  const OUT="/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/eslint-full-baseline.json";
  const CWD="/Users/sawyer/gitSync/gpt-cursor-runner";
  const qPath="/Users/sawyer/gitSync/gpt-cursor-runner/config/eslint.quarantine.manifest.json";
  
  const _req=Module.prototype.require;
  Module.prototype.require=function(id){ 
    if(id==='ms')return (v)=>Number.parseFloat(v)||0; 
    if(id==='semver')return {satisfies:()=>true,valid:(v)=>v||null,coerce:(v)=>({version:String(v||'0.0.0')})}; 
    return _req.apply(this,arguments); 
  };
  
  let ESLint; 
  try{
    ({ESLint}=require('eslint'));
  }catch(e){
    fs.writeFileSync(OUT,JSON.stringify({ok:false,error:"eslint-not-available",details:String(e)}));
    console.log(JSON.stringify({ok:false,error:"eslint-not-available"}));
    process.exit(0);
  }
  
  const man=JSON.parse(fs.readFileSync(qPath,'utf8'));
  const globs=(man.quarantine||[]).map(g=>g.replace(/\/\*\*/g,'/**/*')).map(g=> g.endsWith('/**') ? g + '/*.{js,ts,tsx}' : g);
  
  try{
    const eslint=new ESLint({cwd:CWD,useEslintrc:true,errorOnUnmatchedPattern:false});
    const results=await eslint.lintFiles(globs);
    let errors=0,warnings=0; 
    for(const r of results){
      errors+=r.errorCount||0; 
      warnings+=r.warningCount||0;
    }
    const formatter=await eslint.loadFormatter("json");
    fs.writeFileSync(OUT, formatter.format(results));
    console.log(JSON.stringify({ok:false,counts:{errors,warnings},files:results.length},null,2)); 
    process.exit(0);
  }catch(e){
    fs.writeFileSync(OUT,JSON.stringify({ok:false,error:"baseline-run-failed",details:String(e)})); 
    console.log(JSON.stringify({ok:false})); 
    process.exit(0);
  }
})();
