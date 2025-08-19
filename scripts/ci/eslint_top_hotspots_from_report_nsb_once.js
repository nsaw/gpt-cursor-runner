#!/usr/bin/env node
const fs=require('fs');
const [,, jsonIn, mdOut, topN]=process.argv;
const data=JSON.parse(fs.readFileSync(jsonIn,'utf8'));
const sorted=data.sort((a,b) => (b.errorCount||0)-(a.errorCount||0)||(b.warningCount||0)-(a.warningCount||0));
const top=sorted.slice(0,Number(topN||10));
const md=top.map(f => `- **${f.filePath}**: ${f.errorCount||0} errors, ${f.warningCount||0} warnings`).join('\n');
fs.writeFileSync(mdOut,`# ESLint Hotspots (Top ${top.length})\n\n${md}\n`);
