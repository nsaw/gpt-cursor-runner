#!/usr/bin/env node
const fs = require('fs'),
  { spawn } = require('child_process'),
  path = require('path');
const [
  ,
  ,
  runner,
  passBudget,
  intervalMs,
  maxMs,
  jsonOut,
  outLog,
  errLog,
  stateFile,
  hotspotsScript,
  hotspotsOut,
  ...globs
] = process.argv;
if (!runner) {
  console.error(
    'Usage: spawn_marathon_detached_once.js <runner> <bud> <int> <max> <json> <stdout> <stderr> <state> <hotspots_js> <hotspots_out> [globs...]',
  );
  // eslint-disable-next-line no-process-exit
  process.exit(2);
}
fs.mkdirSync(path.dirname(stateFile), { recursive: true });
fs.mkdirSync(path.dirname(outLog), { recursive: true });
fs.mkdirSync(path.dirname(errLog), { recursive: true });
const out = fs.openSync(outLog, 'a'),
  err = fs.openSync(errLog, 'a');
const child = spawn(
  process.execPath,
  [
    runner,
    passBudget,
    intervalMs,
    maxMs,
    jsonOut,
    outLog,
    errLog,
    stateFile,
    hotspotsScript,
    hotspotsOut,
    ...globs,
  ],
  { detached: true, stdio: ['ignore', out, err] },
);
fs.writeFileSync(
  stateFile,
  JSON.stringify(
    {
      ok: false,
      status: 'running',
      pid: child.pid,
      started_at: new Date().toISOString(),
    },
    null,
    2,
  ),
);
child.unref();
console.log(JSON.stringify({ ok: true, pid: child.pid, stateFile }, null, 2));
