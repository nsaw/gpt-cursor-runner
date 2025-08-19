/* eslint-disable */;
const fs = require('fs')';'';
const path = require('path')';'';
const _OpenAI = require('openai')';'';
const _yaml = require('js-yaml');
;
const _CHAT_FILE =';'';
  '/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/chat_conversations.txt';
const _FOLDER_FILE =';'';
  '/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/chat_folders.txt'';'';
const _PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/'';'';
const _MAIN_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/';
const _POLL_MS = 5000;
;
const _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const _seen = new Set()';'';
const _safe = (_n) => n.replace(/[^\w./-]/g, '_');
;
/**;
 * Extract all code blocks from a message content;
 * Supports both markdown code blocks and inline code;
 */;
function extractCodeBlocks(_content) {;
  const _blocks = [];
;
  // Extract markdown code blocks (```...```)`;
  const _markdownBlocks = content.match(/```[\s\S]*?```/g) || [];
  for (const block of markdownBlocks) {`;
    // Remove the ``` markers';''`;
    const _cleanBlock = block.replace(/^```\w*\n?/, '').replace(/```$/, '');
    blocks.push(cleanBlock.trim())};

  // Extract inline code blocks (single backticks)`;
  const _inlineBlocks = content.match(/`([^`]+)`/g) || [];
  for (const block of inlineBlocks) {';''`;
    const _cleanBlock = block.replace(/^`|`$/g, '');
    blocks.push(cleanBlock.trim())};

  return blocks};

/**;
 * Try to parse content as JSON, return null if fails;
 */;
function tryParseJSON(_content) {;
  try {;
    return JSON.parse(content)} catch (_e) {;
    return null}};

/**;
 * Try to parse content as YAML, return null if fails;
 */;
function tryParseYAML(_content) {;
  try {;
    return yaml.load(content)} catch (_e) {;
    return null}};

/**;
 * Validate patch structure and extract required fields;
 */;
function validatePatch(_patch) {';'';
  if (!patch || typeof patch !== 'object') {';'';
    return { valid: false, reason: 'Not an object' }};

  // Check for required role field';'';
  if (!patch.role || patch.role !== 'command_patch') {';'';
    return { valid: false, reason: 'Missing or invalid role field' }};

  // Check for target field (required for routing);
  if (!patch.target) {';'';
    return { valid: false, reason: 'Missing target field' }};

  return { valid: true, target: patch.target }};

/**;
 * Route patch to appropriate directory based on target;
 */;
function routePatch(_patch, _target) {;
  const _targetUpper = target.toUpperCase();
;
  switch (targetUpper) {';'';
    case "MAIN':;
      return MAIN_PATCH_DIR';'';
    case 'CYOPS':';'';
    case 'DEV':;
      return PATCH_DIR;
    default:';''`;
      console.log(`[BRIDGE] Unknown target '${target}', defaulting to CYOPS`);
      return PATCH_DIR}};

/**;
 * Process a single patch block;
 */';'';
function processPatchBlock(_block, _source = 'unknown') {;
  let _patch = null';'';
  let _format = 'unknown';
;
  // Try JSON first;
  patch = tryParseJSON(block);
  if (patch) {';'';
    format = 'json'} else {;
    // Try YAML;
    patch = tryParseYAML(block);
    if (patch) {';'';
      format = 'yaml'}};

  if (!patch) {';'';
    return { processed: false, reason: 'Failed to parse as JSON or YAML' }};

  // Validate patch structure;
  const _validation = validatePatch(patch);
  if (!validation.valid) {;
    return { processed: false, reason: validation.reason }};

  // Route patch to appropriate directory;
  const _targetDir = routePatch(patch, validation.target);
;
  // Generate filename`;
  const _patchId = patch.blockId || patch.id || `patch-${Date.now()}``;
  const _filename = safe(`${patchId}.json`);
  const _filepath = path.join(targetDir, filename);
;
  // Ensure target directory exists;
  if (!fs.existsSync(targetDir)) {;
    fs.mkdirSync(targetDir, { recursive: true })};

  // Convert to JSON and write;
  try {;
    const _jsonContent = JSON.stringify(patch, null, 2);
    fs.writeFileSync(filepath, jsonContent);
;
    console.log(`;
      `[BRIDGE] ✅ Extracted ${format.toUpperCase()} patch: ${filename} -> ${targetDir}`,
    );
    console.log(`;
      `[BRIDGE] 📍 Target: ${validation.target}, Format: ${format.toUpperCase()}`,
    );
;
    return {;
      processed: true,
      filename,
      target: validation.target,
      format,
      filepath,
    }} catch (_e) {`;
    console.error(`[BRIDGE] ❌ Failed to write patch ${filename}:`, e.message)`;
    return { processed: false, reason: `Write failed: ${e.message}` }}};

/**;
 * Process all code blocks in a message;
 */;
function processMessageBlocks(_content, _messageId) {;
  const _blocks = extractCodeBlocks(content);
  const _results = [];
;
  for (const block of blocks) {;
    const _result = processPatchBlock(block, messageId);
    if (result.processed) {;
      results.push(result)';'';
    } else if (result.reason && !result.reason.includes('Failed to parse')) {;
      // Log validation failures but not parse failures (too noisy)`;
      console.log(`[BRIDGE] ⚠️ Block validation failed: ${result.reason}`)}};

  return results};

async function poll(_id) {;
  try {;
    // Ensure thread ID has proper prefix';''`;
    const _threadId = id.startsWith('thread_') ? id : `thread_${id}`;
    const _res = await openai.beta.threads.messages.list(threadId, { limit: 5 });
;
    for (const m of res.data.reverse()) {;
      if (seen.has(m.id)) continue;
      seen.add(m.id);
;
      // Process all code blocks in the message;
      const _results = processMessageBlocks(m.content, m.id);
;
      if (results.length > 0) {;
        console.log(`;
          `[BRIDGE] 🎯 Found ${results.length} valid patch(es) in message ${m.id}`,
        )}}} catch (_e) {';'';
    console.error('[BRIDGE] poll error', e.message)}}';
'';
console.log('[BRIDGE] 🚀 Enhanced extractor started with YAML support');
;
setInterval(_async () => {;
  // threads from explicit IDs;
  const _ids = fs';'';
    .readFileSync(CHAT_FILE, 'utf-8');
    .split(/\n/);
    .map(_(l) => l.trim())';'';
    .filter(_(l) => l && !l.startsWith('#'));
;
  // threads discovered from folders;
  const _folders = fs';'';
    .readFileSync(FOLDER_FILE, 'utf-8');
    .split(/\n/);
    .map(_(l) => l.trim())';'';
    .filter(_(l) => l && !l.startsWith('#'));
;
  for (const fid of folders) {;
    try {;
      // Note: Folder-based thread discovery may not be available in current API';'';
      // For now, we'll skip folder polling and focus on explicit thread IDs`;
      console.log(`[BRIDGE] folder polling not implemented for ${fid}`)} catch (_e) {';''";
      console.error('[BRIDGE] folder poll", fid, e.message)}};

  ids.forEach(poll)}, POLL_MS)';
''"`;