const express = require('express');
const registry = require('../../utils/registry');
const app = express();
app.use(express.json());

registry.register('runner', 5050);

app.post('/run-patch', async (req, res) => {
  const filePath = req.body.file;
  const processor = require('../../scripts/processor');
  await processor(filePath);
  res.json({ status: 'ok' });
});
app.listen(5050, () => console.log('Runner microservice live')); 