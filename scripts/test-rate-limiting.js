const processor = require("./processor");

async function testRateLimiting() {
  console.log("[TEST] Testing rate limiting...");

  // First call - should work
  console.log("[TEST] First call...");
  await processor("test1.json");

  // Second call immediately - should be rate limited
  console.log("[TEST] Second call (should be rate limited)...");
  await processor("test2.json");

  // Wait 11 seconds
  console.log("[TEST] Waiting 11 seconds for cooldown...");
  await new Promise((resolve) => setTimeout(resolve, 11000));

  // Third call after cooldown - should work
  console.log("[TEST] Third call after cooldown...");
  await processor("test3.json");

  console.log("[TEST] Rate limiting test completed.");
}

testRateLimiting();
