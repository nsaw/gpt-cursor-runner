// ghost-bridge.js — Slack patch listener
const express = require('express');
const { createEventAdapter } = require('@slack/events-api');
const { WebClient } = require('@slack/web-api');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const web = new WebClient(process.env.SLACK_BOT_TOKEN);

app.use('/slack/events', slackEvents.expressMiddleware());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/slack/commands', (req, res) => {
  const { command, text, user_id } = req.body;
  if (command === '/patch') {
    console.log(`[Slack] Patch requested: ${text}`);
    res.send(`🛠️ Patch command received: ${text}`);
  } else {
    res.send('Command not recognized');
  }
});

app.get('/slack/oauth/callback', (req, res) => {
  res.send('OAuth callback received');
});

const port = process.env.SLACK_PORT || 3000;
app.listen(port, () => console.log(`[ghost-bridge] Listening on port ${port}`)); 