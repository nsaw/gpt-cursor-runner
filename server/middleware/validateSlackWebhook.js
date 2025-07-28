// FILENAME: server/middleware/validateSlackWebhook.js
// PURPOSE: Verifies Slack slash command requests via signing secret

const crypto = require('crypto');
require('dotenv').config();

function validateSlackRequest(req, res, next) {
  const timestamp = req.headers['x-slack-request-timestamp'];
  const sigBase = `v0:${timestamp}:${req.rawBody.toString()}`;
  const mySig = `v0=${  crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET).update(sigBase).digest('hex')}`;
  const slackSig = req.headers['x-slack-signature'];

  if (!slackSig || !crypto.timingSafeEqual(Buffer.from(mySig), Buffer.from(slackSig))) {
    return res.status(403).send('❌ Invalid Slack signature.');
  }

  next();
}

module.exports = { validateSlackRequest };
