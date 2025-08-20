/* eslint-disable */
const { test, expect, request } = require('@playwright/test');
test('metro responds on :8081', async () => {
  const ctx = await request.newContext();
  const res = await ctx.get('http://127.0.0.1:8081/');
  expect(res.status()).toBeGreaterThanOrEqual(200);
  expect(res.status()).toBeLessThan(500);
});
