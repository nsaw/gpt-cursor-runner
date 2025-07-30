/* eslint-disable */
const fs=require('fs');const path=require('path');const{Configuration,OpenAIApi}=require('openai');
const CHAT_FILE='/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/chat_conversations.txt';
const PATCH_DIR='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/';
const POLL_MS=5000;
const openai=new OpenAIApi(new Configuration({apiKey:process.env.OPENAI_API_KEY}));
const seen=new Set();
const safe=n=>n.replace(/[^\w./-]/g,'_');
async function poll(id){try{const res=await openai.beta.threads.messages.list(id,{limit:5});for(const m of res.data.reverse()){if(seen.has(m.id))continue;seen.add(m.id);const match=m.content.match(/\{[\s\S]*"role":"command_patch"[\s\S]*\}/);if(match){const json=JSON.parse(match[0]);const file=safe(json.target_file||path.join(PATCH_DIR,`${json.id}.json`));fs.writeFileSync(file,JSON.stringify(json,null,2));console.log(`[BRIDGE] wrote ${file}`);}}}catch(e){console.error('[BRIDGE] poll error',e.message);}}
console.log('[BRIDGE] extractor started');setInterval(async () => {
  // threads from explicit IDs
  const ids = fs.readFileSync(CHAT_FILE,'utf-8')
    .split(/\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
  // threads discovered from folders
  const folders = fs.readFileSync(FOLDER_FILE,'utf-8')
    .split(/\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#'));
  for (const fid of folders) {
    try {
      const list = await openai.beta.threads.list({ folder_id: fid, limit: 100 });
      list.data.forEach(th => ids.push(th.id));
    } catch(e) { console.error('[BRIDGE] folder poll', fid, e.message); }
  }
  ids.forEach(poll);
}, POLL_MS);(poll);},POLL_MS);
