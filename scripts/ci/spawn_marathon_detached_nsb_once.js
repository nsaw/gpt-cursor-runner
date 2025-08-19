#!/usr/bin/env node
const {spawn}=require('child_process'), path=require('path');
const [,, passBudget, intervalMs, maxMs, jsonOut, outLog, errLog, stateFile, hotspotsJs, hotspotsOut, ...globs]=process.argv;
const child=spawn(process.execPath,[path.resolve(__dirname,'eslint_fix_marathon_runner_nsb_once.js'),
  passBudget,intervalMs,maxMs,jsonOut,outLog,errLog,stateFile,hotspotsJs,hotspotsOut,...globs],{
  detached:true,stdio:'ignore'
});
child.unref();
console.log(`Marathon spawned with PID ${child.pid}`);
