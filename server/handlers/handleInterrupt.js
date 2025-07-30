module.exports = async ({ command, ack, respond }) => {
  await ack();
  
  await respond({
    response_type: 'in_channel',
    text: `✅ *Interrupt*

` +
          `• Command: /interrupt
` +
          `• Status: Handler implemented
` +
          `• Function: Interrupt

` +
          'This command will be fully implemented to handle its specific functionality.'
  });
};