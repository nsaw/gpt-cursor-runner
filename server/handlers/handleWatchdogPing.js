module.exports = async ({ command, ack, respond }) => {
  await ack();
  
  await respond({
    response_type: 'in_channel',
    text: `✅ *Watchdog Ping*

` +
          `• Command: /watchdogping
` +
          `• Status: Handler implemented
` +
          `• Function: Watchdog Ping

` +
          `This command will be fully implemented to handle its specific functionality.`
  });
};