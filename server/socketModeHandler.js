const { SocketModeClient } = require('@slack/socket-mode');
const { WebClient } = require('@slack/web-api');

/**
 * Socket Mode Handler for GPT-Cursor Runner
 * 
 * Handles real-time communication with Slack using Socket Mode v2
 * This replaces webhook-based communication for better reliability
 */

class SocketModeHandler {
  constructor() {
    this.socketMode = null;
    this.webClient = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000; // 5 seconds
  }

  /**
   * Initialize Socket Mode connection
   */
  async initialize() {
    try {
      const appToken = process.env.SLACK_APP_TOKEN;
      const botToken = process.env.SLACK_BOT_TOKEN;

      if (!appToken) {
        throw new Error('SLACK_APP_TOKEN is required for Socket Mode');
      }

      if (!botToken) {
        throw new Error('SLACK_BOT_TOKEN is required for Socket Mode');
      }

      // Initialize Socket Mode client
      this.socketMode = new SocketModeClient({
        appToken,
        logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
      });

      // Initialize Web client
      this.webClient = new WebClient(botToken);

      // Set up event listeners
      this.setupEventListeners();

      console.log('🔌 Socket Mode handler initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Socket Mode:', error.message);
      return false;
    }
  }

  /**
   * Set up event listeners for Socket Mode
   */
  setupEventListeners() {
    // Handle incoming events
    this.socketMode.on('events_api', async (event) => {
      try {
        console.log('📨 Received event:', event.type);
        await this.handleEvent(event);
      } catch (error) {
        console.error('❌ Error handling event:', error);
      }
    });

    // Handle slash commands
    this.socketMode.on('slash_commands', async (event) => {
      try {
        console.log('🔪 Received slash command:', event.command);
        await this.handleSlashCommand(event);
      } catch (error) {
        console.error('❌ Error handling slash command:', error);
      }
    });

    // Handle interactive components
    this.socketMode.on('interactive', async (event) => {
      try {
        console.log('🔘 Received interactive component');
        await this.handleInteractive(event);
      } catch (error) {
        console.error('❌ Error handling interactive component:', error);
      }
    });

    // Connection events
    this.socketMode.on('connecting', () => {
      console.log('🔄 Connecting to Slack...');
    });

    this.socketMode.on('connected', () => {
      console.log('✅ Connected to Slack via Socket Mode');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socketMode.on('disconnected', () => {
      console.log('🔌 Disconnected from Slack');
      this.isConnected = false;
    });

    this.socketMode.on('error', (error) => {
      console.error('❌ Socket Mode error:', error);
      this.handleReconnection();
    });
  }

  /**
   * Start Socket Mode connection
   */
  async start() {
    try {
      console.log('🚀 Starting Socket Mode connection...');
      await this.socketMode.start();
      console.log('✅ Socket Mode started successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to start Socket Mode:', error.message);
      return false;
    }
  }

  /**
   * Stop Socket Mode connection
   */
  async stop() {
    try {
      if (this.socketMode) {
        await this.socketMode.disconnect();
        console.log('🔌 Socket Mode stopped');
      }
      this.isConnected = false;
    } catch (error) {
      console.error('❌ Error stopping Socket Mode:', error);
    }
  }

  /**
   * Handle reconnection logic
   */
  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    setTimeout(async () => {
      try {
        await this.start();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.handleReconnection();
      }
    }, this.reconnectDelay);
  }

  /**
   * Handle incoming events
   */
  async handleEvent(event) {
    const { type, event: eventData } = event;

    switch (type) {
    case 'app_mention':
      await this.handleAppMention(eventData);
      break;
    case 'message':
      await this.handleMessage(eventData);
      break;
    default:
      console.log(`📨 Unhandled event type: ${type}`);
    }
  }

  /**
   * Handle app mention events
   */
  async handleAppMention(eventData) {
    try {
      const { text, channel, user } = eventData;
      console.log(`👋 App mentioned by ${user} in ${channel}: ${text}`);

      // Send acknowledgment
      await this.webClient.chat.postMessage({
        channel,
        text: 'Hello! I\'m the GPT-Cursor Runner. Use /status to check my current status.'
      });
    } catch (error) {
      console.error('❌ Error handling app mention:', error);
    }
  }

  /**
   * Handle message events
   */
  async handleMessage(eventData) {
    try {
      const { text, channel, user, subtype } = eventData;
      
      // Skip bot messages and other subtypes
      if (subtype || user === 'USLACKBOT') {
        return;
      }

      console.log(`💬 Message from ${user} in ${channel}: ${text}`);
      
      // Add your message handling logic here
      // For example, detect keywords and respond accordingly
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  }

  /**
   * Handle slash commands
   */
  async handleSlashCommand(event) {
    try {
      const { command, text, user_id, channel_id } = event;
      console.log(`🔪 Slash command: ${command} from ${user_id} in ${channel_id}`);

      // Route to appropriate command handler
      const response = await this.routeCommand(command, text, user_id, channel_id);
      
      // Send response
      await this.webClient.chat.postMessage({
        channel: channel_id,
        ...response
      });
    } catch (error) {
      console.error('❌ Error handling slash command:', error);
      
      // Send error response
      await this.webClient.chat.postMessage({
        channel: event.channel_id,
        text: '❌ Sorry, there was an error processing your command.'
      });
    }
  }

  /**
   * Handle interactive components
   */
  async handleInteractive(event) {
    try {
      const { type, user, channel } = event;
      console.log(`🔘 Interactive component: ${type} from ${user.id} in ${channel.id}`);

      // Handle different interactive component types
      switch (type) {
      case 'block_actions':
        await this.handleBlockActions(event);
        break;
      case 'view_submission':
        await this.handleViewSubmission(event);
        break;
      default:
        console.log(`🔘 Unhandled interactive type: ${type}`);
      }
    } catch (error) {
      console.error('❌ Error handling interactive component:', error);
    }
  }

  /**
   * Route commands to appropriate handlers
   */
  async routeCommand(command, text, userId, channelId) {
    // Import command handlers
    const { handleStatus } = require('./handlers/handleStatus');
    const { handleDashboard } = require('./handlers/handleDashboard');
    const { handleWhoami } = require('./handlers/handleWhoami');
    // Add other handlers as needed

    switch (command) {
    case '/status':
      return await handleStatus(userId, channelId);
    case '/dashboard':
      return await handleDashboard(userId, channelId);
    case '/whoami':
      return await handleWhoami(userId, channelId);
    default:
      return {
        text: `❌ Unknown command: ${command}. Use /status to see available commands.`
      };
    }
  }

  /**
   * Handle block actions
   */
  async handleBlockActions(event) {
    // Handle button clicks, select menus, etc.
    console.log('🔘 Block action received:', event.actions);
  }

  /**
   * Handle view submissions
   */
  async handleViewSubmission(event) {
    // Handle modal submissions
    console.log('🔘 View submission received:', event.view);
  }

  /**
   * Send message to channel
   */
  async sendMessage(channel, text, attachments = null) {
    try {
      const message = {
        channel,
        text
      };

      if (attachments) {
        message.attachments = attachments;
      }

      const result = await this.webClient.chat.postMessage(message);
      return result;
    } catch (error) {
      console.error('❌ Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }
}

module.exports = SocketModeHandler; 