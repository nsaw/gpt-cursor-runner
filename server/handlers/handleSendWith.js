module.exports = async ({ command, ack, respond }) => {
  await ack();
  
  await respond({
    response_type: 'in_channel',
    text: `✅ *Send With*

` +
          `• Command: /sendwith
` +
          `• Status: Handler implemented
` +
          `• Function: Send With

` +
          `This command will be fully implemented to handle its specific functionality.`
  });
};