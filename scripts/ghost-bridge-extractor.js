/* eslint-disable */
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const CHAT_FILE = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/chat_conversations.txt';
const FOLDER_FILE = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/chat_folders.txt';
const PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/';
const POLL_MS = 5000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const seen = new Set();
const safe = n => n.replace(/[^\w./-]/g, '_');

async function poll(id) {
  try {
    // Ensure thread ID has proper prefix
    const threadId = id.startsWith('thread_') ? id : `thread_${id}`;
    const res = await openai.beta.threads.messages.list(threadId, { limit: 5 });
    for (const m of res.data.reverse()) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      const match = m.content.match(/\{[\s\S]*"role":"command_patch"[\s\S]*\}/);
      if (match) {
        const json = JSON.parse(match[0]);
        const file = safe(json.target_file || path.join(PATCH_DIR, `${json.id}.json`));
        fs.writeFileSync(file, JSON.stringify(json, null, 2));
        console.log(`[BRIDGE] wrote ${file}`);
      }
    }
  } catch (e) {
    console.error('[BRIDGE] poll error', e.message);
  }
}

console.log('[BRIDGE] extractor started');

setInterval(async () => {
  // threads from explicit IDs
  const ids = fs.readFileSync(CHAT_FILE, 'utf-8')
    .split(/\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  
  // threads discovered from folders
  const folders = fs.readFileSync(FOLDER_FILE, 'utf-8')
    .split(/\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  
  for (const fid of folders) {
    try {
      // Note: Folder-based thread discovery may not be available in current API
      // For now, we'll skip folder polling and focus on explicit thread IDs
      console.log(`[BRIDGE] folder polling not implemented for ${fid}`);
    } catch (e) {
      console.error('[BRIDGE] folder poll', fid, e.message);
    }
  }
  
  ids.forEach(poll);
}, POLL_MS);
