const request = require('supertest');
const app = require('../scripts/ghost-runner');

test('POST /patch returns 200 quickly', async () => {
  const start = Date.now();
  const res = await request(app)
    .post('/patch')
    .send({ id: 'unit-test-patch', role: 'command_patch', patch: {} });
  expect(res.statusCode).toBe(200);
  expect(res.body.saved).toBe(true);
  expect(Date.now() - start).toBeLessThan(150);
});