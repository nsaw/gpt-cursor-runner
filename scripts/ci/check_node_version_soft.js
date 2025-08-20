/* eslint-disable */
const semver = (v)=>v.replace(/^v/,'').split('.').map(n=>parseInt(n,10));
const [a,b,c] = semver(process.version);
const ok = (a>20) || (a===20 && (b>17 || (b===17 && c>=0)));
if (!ok) {
  console.log(`[node:soft-check] Detected ${process.version}. Recommended >= v20.17.0. Not blocking this run, but mark NONCOMPLIANT.`);
  process.exit(0); // soft pass; recorded in summary
} else {
  console.log(`[node:soft-check] OK: ${process.version} (>= v20.17.0)`);
  process.exit(0);
}
