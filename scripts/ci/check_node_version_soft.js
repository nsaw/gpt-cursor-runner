/* eslint-disable */
const semver = v=>v.replace(/^v/,'').split('.').map(n=>parseInt(n,10));
const [a,b,c] = semver(process.version);
const ok = (a>20) || (a===20 && (b>17 || (b===17 && c>=0)));
console.log(ok ? `[node:soft-check] OK: ${process.version} (>= v20.17.0)` :
                 `[node:soft-check] NONCOMPLIANT: ${process.version}; recommend >= v20.17.0 (not blocking).`);
process.exit(0);
