/* eslint-disable */
const fs=require('fs'), crypto=require('crypto'); const f=process.argv[2];
const md5=b=>crypto.createHash('md5').update(b).digest('hex');
const buf=fs.readFileSync(f); process.stdout.write(md5(buf));
