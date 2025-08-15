import { listPlain, listP1, jsonWrite } from "../tools/nb_utils.mjs";

const ROOT = process.env.ROOT,
  META = process.env.META,
  PLAIN = process.env.PATCHES_ROOT,
  P1 = process.env.PATCHES_P1;

console.log("Testing utilities...");
console.log("ROOT:", ROOT);
console.log("PATCHES_ROOT:", PLAIN);
console.log("PATCHES_P1:", P1);
console.log("META:", META);

const plain = listPlain(PLAIN);
const p1 = listP1(P1);

console.log("Plain patches:", plain);
console.log("P1 patches:", p1);

jsonWrite("/tmp/test.json", { test: "ok" });
console.log("jsonWrite test passed");

console.log("All tests passed");
