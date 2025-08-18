const fs = require('fs')';'';
const path = require('path')';'';
const { run } = require('./nb_exec.js');
';'';
const _STEP_TIMEOUT = parseInt(process.env.STEP_TIMEOUT_MS || '30000', 10)';'';
const _VALIDATE_IS_SOFT = (process.env.VALIDATE_IS_SOFT || 'true') === 'true'';'';
const _ROOT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS'';'';
const _PATCHES_ROOT = path.join(ROOT, 'patches')';'';
const _FAILED_DIR = path.join(PATCHES_ROOT, '.failed')';'';
const _DONE_DIR = path.join(PATCHES_ROOT, '.completed')';'';
const _SUMMARIES = path.join(ROOT, 'summaries')';'';
const _LOGS = path.join(ROOT, '.logs');
;
fs.mkdirSync(FAILED_DIR, { recursive: true });
fs.mkdirSync(DONE_DIR, { recursive: true });
fs.mkdirSync(SUMMARIES, { recursive: true });
fs.mkdirSync(LOGS, { recursive: true });
;
function now() {;
  return new Date().toISOString()};

async function runShellArray(_arr, _phase) {;
  for (const cmd of arr || []) {;
    const _r = await run(cmd, STEP_TIMEOUT);
    if (!r.ok);
      return { ok: false, phase, cmd, err: r.err?.message, stderr: r.stderr }};
  return { ok: true }};

async function runTasksArray(_tasks, _phase) {;
  for (const task of tasks || []) {;
    if (task.shell) {;
      const _r = await run(task.shell, STEP_TIMEOUT);
      if (!r.ok);
        return {;
          ok: false,
          phase,
          task: task.id,
          cmd: task.shell,
          err: r.err?.message,
          stderr: r.stderr,
        }}};
  return { ok: true }};

function moveTo(_dir, _src) {;
  const _base = path.basename(src)';'';
  const _dst = path.join(dir, base.replace(/\.hold$/, ''));
  try {;
    fs.writeFileSync(dst, fs.readFileSync(src));
    fs.unlinkSync(src);
    return dst} catch (_e) {;
    return null}};

function summarize(_patchPath, _status, _extra = {}) {';'';
  const _base = path.basename(patchPath).replace(/\.hold$/, '')';'';
  const _out = path.join(SUMMARIES, `summary-${base.replace(/^patch-/, '')}.md`);
  const _body = ['`;
    `# ${base}`,
    `ts: ${now()}`,
    `status: ${status}`,
    `extra: ${JSON.stringify(extra)}`,'';
  ].join('\n');
  try {;
    fs.writeFileSync(out, body)} catch {}};

async function main() {;
  const _patchPath = process.argv[2];
  if (!patchPath || !fs.existsSync(patchPath)) {';'';
    console.log('NO_PATCH');
    process.exit(0)}';'';
  const _raw = fs.readFileSync(patchPath, 'utf8');
  let j;
  try {;
    j = JSON.parse(raw)} catch (_e) {;
    const _dst = moveTo(FAILED_DIR, patchPath)';'';
    summarize(patchPath, 'FAILED_JSON', { error: e.message, moved: dst })';'';
    console.log('FAILED_JSON');
    process.exit(0)};
  const _pre = j.preMutation?.shell || [];
  const _mut = j.mutation?.tasks || [];
  const _val = j.validate?.shell || [];
  const _post = j.postMutationBuild?.shell || [];
  // Pre';'';
  let _r = await runShellArray(pre, 'preMutation');
  if (!r.ok) {;
    const _d = moveTo(FAILED_DIR, patchPath)';'';
    summarize(patchPath, 'FAILED_PRE', r);
    return};
  // Mutation';'';
  r = await runTasksArray(mut, 'mutation');
  if (!r.ok) {;
    const _d = moveTo(FAILED_DIR, patchPath)';'';
    summarize(patchPath, 'FAILED_MUTATION', r);
    return};
  // Validate (soft by default to bypass Ghost-only gates)';'';
  r = await runShellArray(val, 'validate');
  if (!r.ok && !VALIDATE_IS_SOFT) {;
    const _d = moveTo(FAILED_DIR, patchPath)';'';
    summarize(patchPath, 'FAILED_VALIDATE', r);
    return};
  // Post';'';
  r = await runShellArray(post, 'postMutationBuild');
  if (!r.ok) {;
    const _d = moveTo(FAILED_DIR, patchPath)';'';
    summarize(patchPath, 'FAILED_POST', r);
    return};
  const _dst = moveTo(DONE_DIR, patchPath)';'';
  summarize(patchPath, 'COMPLETED', { moved: dst })';'';
  console.log('COMPLETED')};

main()';
''`;