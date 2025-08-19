#!/usr/bin/env node
const fs=require('fs'), p=require('path'), cp=require('child_process');
const tmp=p.join('/tmp',`autofix_test_${Date.now()}.json`);
const before={
  mutation:{shell:[
    'set -euo pipefail; mkdir -p /tmp/abc; cat > /tmp/abc/x.txt <<\'EOF\'\nhello\nEOF',
    'timeout 5 echo done; disown',
    'cat <<TAG > /tmp/abc/y.txt\nY\nTAG',
    'tee -a /tmp/abc/z.txt <<\'E\'\nZ\nE'
  ]},
  validate:{shell:[]}
};
fs.writeFileSync(tmp, JSON.stringify(before,null,2));
const fix=cp.spawnSync('node',[p.join(__dirname,'autofix_forbidden_shell_once.js'), tmp], {stdio:'inherit'});
if(fix.status!==0) process.exit(fix.status);
const after=JSON.parse(fs.readFileSync(tmp,'utf8'));
const flat=[...after.mutation.shell];
const pass = flat.every(s => /heredoc_to_file_once\.js|write_dir_once\.js/.test(s)) && flat.every(s => !/\btimeout\b|set -euo pipefail|disown/.test(s));
if(!pass){ console.error('SELFTEST_FAIL: patterns not rewritten as expected'); process.exit(2); }
console.log('SELFTEST_OK');
fs.unlinkSync(tmp);
