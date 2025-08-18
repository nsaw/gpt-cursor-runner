#!/usr/bin/env node
const fs=require('fs');
const IN="/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/eslint-full-baseline.json";
const OUT="/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/eslint-top-rules.json";

try{
  const arr=JSON.parse(fs.readFileSync(IN,'utf8'));
  const counts={}; 
  for(const f of arr){ 
    for(const m of (f.messages||[])){ 
      const k=m.ruleId||'__no_rule__'; 
      counts[k]=(counts[k]||0)+1; 
    } 
  }
  const ranked=Object.entries(counts).map(([rule,count])=>({rule,count})).sort((a,b)=>b.count-a.count).slice(0,50);
  fs.writeFileSync(OUT, JSON.stringify({rules:ranked, advice:"Fix top rules first; run patch again to refresh."},null,2));
  console.log(JSON.stringify({ok:true,top:ranked.slice(0,10)},null,2));
}catch(e){ 
  fs.writeFileSync(OUT, JSON.stringify({ok:false,error:String(e)})); 
  console.log(JSON.stringify({ok:false})); 
}
