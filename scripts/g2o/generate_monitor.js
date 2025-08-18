/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env node
(function(){
  const fs=require('fs'), path=require('path');
  const PUB='/Users/sawyer/gitSync/_GPTsync/public', META='/Users/sawyer/gitSync/_GPTsync/meta';
  const out=path.join(PUB,'monitor.html');
  
  if(fs.existsSync(out)){ 
    console.log('MONITOR_EXISTS'); 
    return; 
  }
  
  const safe = (p)=>{
    try{ 
      return JSON.stringify(JSON.parse(fs.readFileSync(p,'utf8'))); 
    }catch(_){ 
      return '{}'; 
    } 
  };
  
  const cc=safe(path.join(META,'queue_counters.json'));
  const fa=safe(path.join(META,'failure_alerts.json'));
  const fam=safe(path.join(META,'failure_alerts_main.json'));
  const ds=safe(path.join(META,'dashboard_status.json'));
  const ts=new Date().toISOString();
  
  const html=[
    '<!doctype html><html><head><meta charset="utf-8"><title>G2o Monitor (Static)</title>',
    '<meta name="viewport" content="width=device-width,initial-scale=1"><style>',
    ':root{--bg:#232529;--fg:#cfe7ff;--card:#1a1c22;--line:#445;--alert:#b00020}body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;background:var(--bg);color:var(--fg)}',
    '#g2o-banner{display:none;position:sticky;top:0;left:0;right:0;background:var(--alert);color:#fff;padding:8px 16px;text-align:center;font-weight:600;z-index:1000}',
    '.container{max-width:1200px;margin:0 auto;padding:20px}.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid var(--line)}',
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-bottom:24px}.card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:20px}',
    '.json-view{background:#1a1c22;border:1px solid var(--line);border-radius:4px;padding:12px;font-family:monospace;font-size:12px;color:#888;max-height:200px;overflow-y:auto}',
    '.compact .card{padding:12px}.compact .card h3{font-size:16px;margin-bottom:12px}.compact .metric{padding:6px 0}',
    '</style></head><body>',
    '<div id="g2o-banner">G2o System Alert</div><div class="container"><div class="header"><div class="title">G2o Monitor (Static)</div>',
    '<div class="timestamp">Generated: <span id="timestamp">'+ts+'</span></div></div>',
    '<div class="grid"><div class="card"><h3>System Status</h3><div class="metric"><span class="metric-label">Execution Mode</span><span class="metric-value">Direct Agent</span></div></div>',
    '<div class="card"><h3>Queue Counters</h3><div class="json-view" id="queue-counters">'+cc+'</div></div>',
    '<div class="card"><h3>Failure Alerts</h3><div class="json-view" id="failure-alerts">'+fa+'</div></div>',
    '<div class="card"><h3>Main Alerts</h3><div class="json-view" id="main-alerts">'+fam+'</div></div>',
    '<div class="card"><h3>Dashboard Status</h3><div class="json-view" id="dashboard-status">'+ds+'</div></div></div></div>',
    '<script>(function(){var u=new URLSearchParams(location.search),b=u.get("banner"),c=u.get("compact");',
    'var bn=document.getElementById("g2o-banner"); bn.style.display=(b==="0"?"none":"block");',
    'if(c==="1"){ document.body.classList.add("compact"); }',
    'console.log("flags banner="+b+" compact="+c);})();</script>',
    '</body></html>'
  ].join('');
  
  fs.mkdirSync(PUB,{recursive:true});
  fs.writeFileSync(out,html);
  console.log('MONITOR_WROTE:'+out);
})();
