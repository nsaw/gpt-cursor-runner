#!/usr/bin/env node
const fs = require('fs'), path = require('path');
const root = process.cwd();
const IGNORE_DIRS = new Set(['.git','node_modules','_backups','.cursor-cache','.github','dist','build','_gpt5intake','summaries','patches','tasks','docs','scripts/.archive','.archive']);
const SELF = path.relative(root, __filename);
const violations = [];

function scan(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.name.startsWith('.DS_Store')) continue;
    const p = path.join(dir,entry.name);
    const rel = path.relative(root,p);
    if(entry.isDirectory()){
      if(IGNORE_DIRS.has(entry.name)) continue;
      scan(p);
    } else {
      if(rel === SELF) continue;
      // Skip validation tools that check for node -e
      if(rel.includes('inline_node_e_scan_once.js') || rel.includes('ban_node_eval_guard.js') || rel.includes('assert_no_inline_node_e_once.js')) continue;
      // text-ish files only
      if(!/\.(js|ts|tsx|sh|bash|zsh|yml|yaml|md|json|workflow)$/.test(entry.name)) continue;
      const s = fs.readFileSync(p,'utf8');
      // Look for actual node -e commands, not comments or documentation
      const lines = s.split('\n');
      for(let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip comment lines and documentation
        if(line.startsWith('#') || line.startsWith('//') || line.startsWith('*') || line.startsWith('<!--')) continue;
        // Skip lines that are just mentioning node -e in documentation
        if(line.includes('node -e') && (line.includes('ban') || line.includes('forbidden') || line.includes('inline'))) continue;
        // Check for actual node -e commands (not echo statements or documentation)
        if(/\bnode\s+-e\b/.test(line) && !line.includes('echo') && !line.includes('##') && !line.includes('Inline')) {
          violations.push(`${rel}:${i+1}`);
          break;
        }
      }
    }
  }
}

scan(root);

// Also inspect package.json scripts
try{
  const pkg = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  const scripts = pkg.scripts || {};
  for(const [k,v] of Object.entries(scripts)){
    if(/\bnode\s+-e\b/.test(String(v||''))) violations.push(`package.json:scripts:${k}`);
  }
}catch{
  // Ignore package.json parse errors
}

if(violations.length){
  console.error(`BAN_NODE_EVAL_GUARD: found forbidden \`node -e\` usage:\n - ${violations.join('\n - ')}`);
  process.exit(1);
} else {
  console.log('BAN_NODE_EVAL_GUARD: OK');
}
