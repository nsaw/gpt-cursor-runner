/* eslint-disable */
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const yaml = require("js-yaml");

const CHAT_FILE =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/chat_conversations.txt";
const FOLDER_FILE =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/chat_folders.txt";
const PATCH_DIR = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/";
const MAIN_PATCH_DIR = "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/";
const POLL_MS = 5000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const seen = new Set();
const safe = (n) => n.replace(/[^\w./-]/g, "_");

/**
 * Extract all code blocks from a message content
 * Supports both markdown code blocks and inline code
 */
function extractCodeBlocks(content) {
  const blocks = [];

  // Extract markdown code blocks (```...```)
  const markdownBlocks = content.match(/```[\s\S]*?```/g) || [];
  for (const block of markdownBlocks) {
    // Remove the ``` markers
    const cleanBlock = block.replace(/^```\w*\n?/, "").replace(/```$/, "");
    blocks.push(cleanBlock.trim());
  }

  // Extract inline code blocks (single backticks)
  const inlineBlocks = content.match(/`([^`]+)`/g) || [];
  for (const block of inlineBlocks) {
    const cleanBlock = block.replace(/^`|`$/g, "");
    blocks.push(cleanBlock.trim());
  }

  return blocks;
}

/**
 * Try to parse content as JSON, return null if fails
 */
function tryParseJSON(content) {
  try {
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

/**
 * Try to parse content as YAML, return null if fails
 */
function tryParseYAML(content) {
  try {
    return yaml.load(content);
  } catch (e) {
    return null;
  }
}

/**
 * Validate patch structure and extract required fields
 */
function validatePatch(patch) {
  if (!patch || typeof patch !== "object") {
    return { valid: false, reason: "Not an object" };
  }

  // Check for required role field
  if (!patch.role || patch.role !== "command_patch") {
    return { valid: false, reason: "Missing or invalid role field" };
  }

  // Check for target field (required for routing)
  if (!patch.target) {
    return { valid: false, reason: "Missing target field" };
  }

  return { valid: true, target: patch.target };
}

/**
 * Route patch to appropriate directory based on target
 */
function routePatch(patch, target) {
  const targetUpper = target.toUpperCase();

  switch (targetUpper) {
    case "MAIN":
      return MAIN_PATCH_DIR;
    case "CYOPS":
    case "DEV":
      return PATCH_DIR;
    default:
      console.log(`[BRIDGE] Unknown target '${target}', defaulting to CYOPS`);
      return PATCH_DIR;
  }
}

/**
 * Process a single patch block
 */
function processPatchBlock(block, source = "unknown") {
  let patch = null;
  let format = "unknown";

  // Try JSON first
  patch = tryParseJSON(block);
  if (patch) {
    format = "json";
  } else {
    // Try YAML
    patch = tryParseYAML(block);
    if (patch) {
      format = "yaml";
    }
  }

  if (!patch) {
    return { processed: false, reason: "Failed to parse as JSON or YAML" };
  }

  // Validate patch structure
  const validation = validatePatch(patch);
  if (!validation.valid) {
    return { processed: false, reason: validation.reason };
  }

  // Route patch to appropriate directory
  const targetDir = routePatch(patch, validation.target);

  // Generate filename
  const patchId = patch.blockId || patch.id || `patch-${Date.now()}`;
  const filename = safe(`${patchId}.json`);
  const filepath = path.join(targetDir, filename);

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Convert to JSON and write
  try {
    const jsonContent = JSON.stringify(patch, null, 2);
    fs.writeFileSync(filepath, jsonContent);

    console.log(
      `[BRIDGE] ✅ Extracted ${format.toUpperCase()} patch: ${filename} -> ${targetDir}`,
    );
    console.log(
      `[BRIDGE] 📍 Target: ${validation.target}, Format: ${format.toUpperCase()}`,
    );

    return {
      processed: true,
      filename,
      target: validation.target,
      format,
      filepath,
    };
  } catch (e) {
    console.error(`[BRIDGE] ❌ Failed to write patch ${filename}:`, e.message);
    return { processed: false, reason: `Write failed: ${e.message}` };
  }
}

/**
 * Process all code blocks in a message
 */
function processMessageBlocks(content, messageId) {
  const blocks = extractCodeBlocks(content);
  const results = [];

  for (const block of blocks) {
    const result = processPatchBlock(block, messageId);
    if (result.processed) {
      results.push(result);
    } else if (result.reason && !result.reason.includes("Failed to parse")) {
      // Log validation failures but not parse failures (too noisy)
      console.log(`[BRIDGE] ⚠️ Block validation failed: ${result.reason}`);
    }
  }

  return results;
}

async function poll(id) {
  try {
    // Ensure thread ID has proper prefix
    const threadId = id.startsWith("thread_") ? id : `thread_${id}`;
    const res = await openai.beta.threads.messages.list(threadId, { limit: 5 });

    for (const m of res.data.reverse()) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);

      // Process all code blocks in the message
      const results = processMessageBlocks(m.content, m.id);

      if (results.length > 0) {
        console.log(
          `[BRIDGE] 🎯 Found ${results.length} valid patch(es) in message ${m.id}`,
        );
      }
    }
  } catch (e) {
    console.error("[BRIDGE] poll error", e.message);
  }
}

console.log("[BRIDGE] 🚀 Enhanced extractor started with YAML support");

setInterval(async () => {
  // threads from explicit IDs
  const ids = fs
    .readFileSync(CHAT_FILE, "utf-8")
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  // threads discovered from folders
  const folders = fs
    .readFileSync(FOLDER_FILE, "utf-8")
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  for (const fid of folders) {
    try {
      // Note: Folder-based thread discovery may not be available in current API
      // For now, we'll skip folder polling and focus on explicit thread IDs
      console.log(`[BRIDGE] folder polling not implemented for ${fid}`);
    } catch (e) {
      console.error("[BRIDGE] folder poll", fid, e.message);
    }
  }

  ids.forEach(poll);
}, POLL_MS);
