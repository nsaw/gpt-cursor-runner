/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env node
const fs=require('fs'), p=require('path'); const d=process.argv[2];
if(!d){console.error("USAGE: write_dir_once.js <dir>");process.exit(2)}
fs.mkdirSync(d,{recursive:true}); console.log("DIR_OK:"+d);
