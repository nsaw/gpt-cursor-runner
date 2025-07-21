module.exports = async ({ command, ack, respond }) => {
  await ack();
  
  await respond({
    response_type: 'in_channel',
    text: `✅ *Roadmap*

` +
          `• Command: /roadmap
` +
          `• Status: Handler implemented
` +
          `• Function: Roadmap

` +
          `This command will be fully implemented to handle its specific functionality.`
  });
};