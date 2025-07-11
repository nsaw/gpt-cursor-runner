const { WebClient } = require('@slack/web-api');

// Initialize Slack Web API client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

module.exports = async (req, res) => { 
  try { 
    const msg = `:satellite: GHOST Ping @ ${new Date().toISOString()}`; 
    console.log(`[GHOST LOG]`, msg); 
    
    // Send message to Slack with error handling
    try {
      const result = await slack.chat.postMessage({
        channel: "#cursor-thoughtmarks-native-build",
        text: msg,
        username: 'GHOST Ping',
        icon_emoji: ':satellite:'
      });
      console.log(`[GHOST SUCCESS] Message sent:`, result.ts);
    } catch (slackError) {
      console.error("Slack send fail:", slackError.message);
      // Continue with response even if Slack fails
    }
    
    res.send("✅ Ping sent to Slack"); 
  } catch (e) { 
    console.error("❌ Ping failed", e); 
    res.send("❌ Ping failed: " + e.message); 
  }
}; 