const express = require('express');
const app = express();
const port = 3002;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'registry' });
});

app.get('/services', (req, res) => {
  res.json({ services: ['relay', 'runner'] });
});

app.listen(port, () => {
  console.log(`Registry service running on port ${port}`);
}).on('error', (err) => {
  console.error('Failed to start registry service:', err);
}); 