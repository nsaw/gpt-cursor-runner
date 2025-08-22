/* eslint-disable */
const fs=require('fs'); const path=require('path');
const OUT="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/_tsconfig.sample.json"; const file=process.argv[2];
if(!file){ console.error("Usage: node ... ts_build_temp_tsconfig_for_file_once.js <abs-path-to-ts-file>"); process.exit(2); }
const cfg={ compilerOptions:{ target:"ES2020", module:"commonjs", jsx:"react-jsx", strict:true, noEmit:true, skipLibCheck:true },
            files:[file] };
fs.mkdirSync(path.dirname(OUT),{recursive:true}); fs.writeFileSync(OUT, JSON.stringify(cfg,null,2)); process.exit(0);
