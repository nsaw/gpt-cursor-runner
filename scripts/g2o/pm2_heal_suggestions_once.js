/* eslint-disable */
const fs = require('fs');
const pre = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_health_pre.json';
const post = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_health_post.json';
const out = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_heal_suggestions.md';
function load(p){ try{ return JSON.parse(fs.readFileSync(p,'utf8')); }catch(_){ return null; } }
const preJ = load(pre), postJ = load(post);
const lines = ['# PM2 Heal Suggestions',''];
const snap = postJ || preJ;
if (!snap || !snap.list) { lines.push('- No PM2 data available.'); }
else {
  const bad = snap.list.filter(p => ['errored','stopped','unknown'].includes((p.pm2_env && p.pm2_env.status)||''));
  if (!bad.length) lines.push('- All processes healthy.');
  bad.forEach(p=>{
    const name = p.name || p.pm_id;
    lines.push(`- ${name}: status=${p.pm2_env?.status||'unknown'} | restarts=${p.pm2_env?.restart_time||0}`);
    lines.push(`  • Suggest: inspect logs at ${p.pm2_env?.pm_out_log_path||'[out.log]'} / ${p.pm2_env?.pm_err_log_path||'[err.log]'} and consider pm2 restart ${name}`);
  });
}
fs.writeFileSync(out, lines.join('\n'));
console.log('[pm2-heal] suggestions written:', out);
