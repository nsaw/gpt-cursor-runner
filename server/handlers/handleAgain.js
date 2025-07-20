module.exports = async ({ command, ack, respond }) => {
  await ack();
  
  await respond({
    response_type: 'in_channel',
    text: `✅ *Again*

` +
          `• Command: /again
` +
          `• Status: Handler implemented
` +
          `• Function: Again

` +
          `This command will be fully implemented to handle its specific functionality.`
  });
};