const { _WebClient } = require("@slack/web-api");
const _stateManager = require("../utils/stateManager");

// Initialize Slack Web API client
const _slack = new WebClient(process.env.SLACK_BOT_TOKEN);

module.exports = async function handleGPTSlackDispatch(_req, _res) {
  const { _user_name, _text } = req.body;
  console.log(
    "⚡️ /gpt-slack-dispatch triggered by:",
    user_name,
    "with text:",
    text,
  );

  try {
    // Parse the GPT dispatch request
    let dispatchRequest;
    try {
      dispatchRequest = JSON.parse(text);
    } catch (_error) {
      res.send(
        "❌ Invalid JSON format. Expected: {\"action\": \"slack.postMessage\", \"channel\": \"#channel\", \"text\": \"message\"}",
      );
      return;
    }

    const { _action, _channel, _blocks, _text, _ts } = dispatchRequest;

    // Validate required fields
    if (!action || !channel) {
      res.send("❌ Missing required fields. Need 'action' and 'channel'");
      return;
    }

    // Check if action is allowed
    const _allowedActions = ["postMessage", "updateMessage", "deleteMessage"];
    if (!allowedActions.includes(action)) {
      res.send(
        `❌ Action '${action}' not allowed. Allowed: ${allowedActions.join(", ")}`,
      );
      return;
    }

    let result;

    switch (action) {
      case "postMessage":
        if (!text && (!blocks || blocks.length === 0)) {
          res.send("❌ Missing 'text' or 'blocks' for postMessage");
          return;
        }

        result = await slack.chat.postMessage({
          channel,
          text: text || "",
          blocks: blocks || undefined,
          username: "GPT-Cursor Runner",
          icon_emoji: ":robot_face:",
        });

        break;

      case "updateMessage":
        if (!ts) {
          res.send("❌ Missing 'ts' (timestamp) for updateMessage");
          return;
        }

        if (!text && (!blocks || blocks.length === 0)) {
          res.send("❌ Missing 'text' or 'blocks' for updateMessage");
          return;
        }

        result = await slack.chat.update({
          channel,
          ts,
          text: text || "",
          blocks: blocks || undefined,
        });

        break;

      case "deleteMessage":
        if (!ts) {
          res.send("❌ Missing 'ts' (timestamp) for deleteMessage");
          return;
        }

        result = await slack.chat.delete({
          channel,
          ts,
        });

        break;

      default:
        res.send(`❌ Unknown action: ${action}`);
        return;
    }

    // Log the dispatch
    await stateManager.updateState({
      lastGPTSlackDispatch: {
        action,
        channel,
        requestedBy: user_name,
        timestamp: new Date().toISOString(),
        success: true,
        result,
      },
    });

    const _response = `
✅ *GPT Slack Dispatch Successful*

*Action:* ${action}
*Channel:* ${channel}
*Requested By:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}

*Result:* ${result.ok ? "✅ Success" : "❌ Failed"}
${result.ts ? `*Message TS:* ${result.ts}` : ""}
${result.channel ? `*Channel ID:* ${result.channel}` : ""}

*Next:* Monitor with \`/status-runner\`
    `.trim();

    res.send(response);
  } catch (_error) {
    console.error("Error in GPT Slack dispatch:", error);

    // Log the failed dispatch
    await stateManager.updateState({
      lastGPTSlackDispatch: {
        action: action || "unknown",
        channel: channel || "unknown",
        requestedBy: user_name,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
      },
    });

    res.send(`❌ Error in GPT Slack dispatch: ${error.message}`);
  }
};
