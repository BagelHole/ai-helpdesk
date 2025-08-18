import { WebClient } from "@slack/web-api";
import { SocketModeClient } from "@slack/socket-mode";
import { Logger } from "./logger-service";
import {
  SlackMessage,
  MessagePriority,
  MessageCategory,
  MessageStatus,
  SlackAPIResponse,
  SlackSettings,
} from "@shared/types";

export class SlackService {
  private webClient: WebClient | null = null;
  private socketClient: SocketModeClient | null = null;
  private logger: Logger;
  private isConnected = false;
  private messageHandlers: ((message: SlackMessage) => void)[] = [];
  private settings: SlackSettings | null = null;
  private categoryKeywords: any[] = [];
  private channelCache: Map<string, string> = new Map(); // channelId -> channelName
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastPolledTimestamp: string = "0";
  private isPolling = false;

  constructor(private databaseService?: any) {
    this.logger = new Logger();
  }

  public async connect(
    botToken: string,
    appToken?: string,
    settings?: SlackSettings
  ): Promise<void> {
    try {
      this.logger.info("Connecting to Slack...");

      // Initialize Web API client
      this.webClient = new WebClient(botToken);

      // Test the connection
      const authResult = await this.webClient.auth.test();
      if (!authResult.ok) {
        throw new Error("Failed to authenticate with Slack");
      }

      this.logger.info(`Connected to Slack workspace: ${authResult.team}`);

      // Store settings for message filtering
      this.settings = settings || null;

      this.isConnected = true;

      // Start polling for new messages instead of Socket Mode
      this.startPolling();
      this.logger.info("Started polling for new messages");
    } catch (error) {
      this.logger.error("Failed to connect to Slack:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      // Stop polling
      this.stopPolling();

      if (this.socketClient) {
        await this.socketClient.disconnect();
        this.socketClient = null;
      }

      this.webClient = null;
      this.isConnected = false;
      this.messageHandlers = [];

      this.logger.info("Disconnected from Slack");
    } catch (error) {
      this.logger.error("Error disconnecting from Slack:", error);
      throw error;
    }
  }

  public isSlackConnected(): boolean {
    return this.isConnected;
  }

  public updateCategoryKeywords(keywords: any[]): void {
    this.categoryKeywords = keywords;
    this.logger.info(
      `Updated category keywords: ${keywords.length} categories`
    );
    keywords.forEach((cat, index) => {
      this.logger.info(
        `Category ${index + 1}: ${cat.displayName} (${cat.category}) - Keywords: [${cat.keywords.join(", ")}]`
      );
    });
  }

  public async forcePoll(): Promise<void> {
    this.logger.info("🔬 Force polling triggered manually");
    this.logger.info(
      `Debug state: isConnected=${this.isConnected}, hasWebClient=${!!this.webClient}, hasSettings=${!!this.settings}`
    );
    if (this.settings) {
      this.logger.info(`Settings: ${JSON.stringify(this.settings)}`);
    }
    await this.pollForNewMessages();
  }

  private startPolling(): void {
    if (this.isPolling || !this.webClient) {
      return;
    }

    this.isPolling = true;
    // Start polling from last 24 hours to catch recent unread messages
    const twentyFourHoursAgo = Date.now() / 1000 - 24 * 60 * 60;
    this.lastPolledTimestamp = twentyFourHoursAgo.toString();

    // Do an immediate first poll
    this.pollForNewMessages().catch((error) => {
      this.logger.error("Error during initial poll:", error);
    });

    // Poll every 10 seconds
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForNewMessages();
      } catch (error) {
        this.logger.error("Error during polling:", error);
      }
    }, 10000);

    this.logger.info(
      "Started polling for new messages every 10 seconds with immediate first poll"
    );
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    this.logger.info("Stopped polling for messages");
  }

  private async pollForNewMessages(): Promise<void> {
    if (!this.webClient || !this.settings) {
      this.logger.debug("Polling skipped: no webClient or settings");
      return;
    }

    try {
      this.logger.debug("🔄 Polling for new messages...");
      // Poll conversations (channels, groups, DMs)
      const conversations = await this.getConversationsToMonitor();
      this.logger.debug(
        `Found ${conversations.length} conversations to monitor`
      );

      for (const conversation of conversations) {
        this.logger.debug(
          `Polling conversation: ${conversation.name} (${conversation.type})`
        );
        await this.pollConversationMessages(conversation.id, conversation.type);
      }
    } catch (error) {
      this.logger.error("Error polling for messages:", error);
    }
  }

  private async getConversationsToMonitor(): Promise<
    Array<{ id: string; name: string; type: string }>
  > {
    if (!this.webClient || !this.settings) return [];

    const conversations: Array<{ id: string; name: string; type: string }> = [];

    try {
      // Get all conversations the bot has access to
      this.logger.debug("Fetching conversations list...");

      this.logger.debug(
        "Trying basic conversations.list without types filter..."
      );
      const response = await this.webClient.conversations.list({
        limit: 1000,
      });

      if (response.ok && response.channels) {
        this.logger.debug(
          `Found ${response.channels.length} total conversations`
        );

        // Log channel count instead of all names to reduce log verbosity
        this.logger.debug(
          `Found ${response.channels.length} total channels available`
        );

        for (const channel of response.channels) {
          const shouldMonitor = this.shouldMonitorConversation(channel);
          this.logger.debug(
            `Channel ${channel.name || channel.id}: shouldMonitor=${shouldMonitor}, type=${this.getConversationType(channel)}`
          );
          if (shouldMonitor) {
            conversations.push({
              id: channel.id!,
              name: channel.name || `dm-${channel.id}`,
              type: this.getConversationType(channel),
            });
          }
        }
      } else {
        this.logger.error("Failed to get conversations:", response.error);
      }
    } catch (error) {
      this.logger.error("Error getting conversations:", error);
    }

    this.logger.debug(
      `Will monitor ${conversations.length} conversations: ${conversations.map((c) => c.name).join(", ")}`
    );
    return conversations;
  }

  private shouldMonitorConversation(channel: any): boolean {
    if (!this.settings) {
      this.logger.debug("No settings - monitoring all conversations");
      return true; // If no settings, monitor everything
    }

    this.logger.debug(
      `Checking channel ${channel.name || channel.id}: ${JSON.stringify({
        is_im: channel.is_im,
        is_group: channel.is_group,
        is_private: channel.is_private,
        is_channel: channel.is_channel,
        is_member: channel.is_member,
        enableMentions: this.settings.enableMentions,
        monitoredChannels: this.settings.monitoredChannels,
        ignoredChannels: this.settings.ignoredChannels,
      })}`
    );

    // Skip DMs and private channels - only monitor public channels
    if (channel.is_im) {
      this.logger.debug(`Skipping IM - DMs not supported`);
      return false;
    }

    // Check groups/private channels
    if (channel.is_group || channel.is_private) {
      this.logger.debug(
        `Skipping group/private - private channels not supported`
      );
      return false;
    }

    // Check public channels
    if (channel.is_channel) {
      // Only monitor channels the bot is a member of
      if (!channel.is_member) {
        this.logger.debug(
          `Skipping channel ${channel.name} - bot is not a member`
        );
        return false;
      }

      const channelName = channel.name;

      // Check ignored channels
      if (
        this.settings.ignoredChannels.length > 0 &&
        channelName &&
        this.settings.ignoredChannels.includes(channelName)
      ) {
        this.logger.debug(`Skipping channel ${channelName} - in ignored list`);
        return false;
      }

      // Check monitored channels (if specified, only monitor those channels)
      if (
        this.settings.monitoredChannels.length > 0 &&
        channelName &&
        !this.settings.monitoredChannels.includes(channelName)
      ) {
        this.logger.debug(
          `Skipping channel ${channelName} - not in monitored list: [${this.settings.monitoredChannels.join(", ")}]`
        );
        return false;
      }
    }

    this.logger.debug(`Will monitor channel ${channel.name || channel.id}`);
    return true;
  }

  private getConversationType(channel: any): string {
    if (channel.is_im) return "im";
    if (channel.is_group) return "group";
    if (channel.is_private) return "private_channel";
    if (channel.is_channel) return "channel";
    return "unknown";
  }

  private async pollConversationMessages(
    conversationId: string,
    type: string
  ): Promise<void> {
    if (!this.webClient) return;

    try {
      this.logger.debug(
        `🔍 Checking messages in ${conversationId} since ${this.lastPolledTimestamp}`
      );
      const response = await this.webClient.conversations.history({
        channel: conversationId,
        oldest: this.lastPolledTimestamp,
        limit: 100,
      });

      if (response.ok && response.messages) {
        this.logger.debug(
          `📨 Found ${response.messages.length} messages in ${conversationId}`
        );
        // Process messages in reverse order (oldest first)
        const messages = response.messages.reverse();

        for (const message of messages) {
          this.logger.debug(
            `Message: ${JSON.stringify({
              ts: message.ts,
              user: message.user,
              text: message.text?.substring(0, 50),
              bot_id: message.bot_id,
              subtype: message.subtype,
            })}`
          );

          // Skip bot messages and message subtypes we don't want
          if (message.bot_id || message.subtype) {
            this.logger.debug(
              `Skipping message: bot_id=${message.bot_id}, subtype=${message.subtype}`
            );
            continue;
          }

          // Convert to our message format and process
          const processedMessage = await this.convertToSlackMessage(
            message,
            conversationId,
            type
          );
          if (processedMessage) {
            this.logger.info(
              `✅ Processing new message from ${processedMessage.user}: ${processedMessage.text.substring(0, 50)}...`
            );
            await this.processMessage(processedMessage);
          }

          // If this message has replies, fetch and process them too
          if (message.reply_count && message.reply_count > 0) {
            this.logger.info(
              `📝 Found thread with ${message.reply_count} replies, fetching thread messages...`
            );
            await this.fetchAndProcessThreadReplies(
              conversationId,
              message.ts!,
              type
            );
          }

          // Update last polled timestamp
          if (
            message.ts &&
            parseFloat(message.ts) > parseFloat(this.lastPolledTimestamp)
          ) {
            this.lastPolledTimestamp = message.ts;
          }
        }
      } else {
        this.logger.debug(
          `No messages or error in ${conversationId}:`,
          response.error
        );
      }
    } catch (error) {
      this.logger.error(`Error polling conversation ${conversationId}:`, error);
    }
  }

  private async convertToSlackMessage(
    message: any,
    channelId: string,
    channelType: string
  ): Promise<SlackMessage | null> {
    if (!message.text || !message.user) {
      return null;
    }

    try {
      // Get user information
      const userInfo = await this.getUserInfo(message.user);

      // Categorize and prioritize the message
      const category = this.categorizeMessage(message.text);
      const priority = this.prioritizeMessage(message.text, category);

      this.logger.info(
        `📋 Message categorized: "${message.text.substring(0, 50)}..." -> Category: ${category}, Priority: ${priority}`
      );

      // Get channel name for display
      const channelName = await this.getChannelName(channelId);

      // Process message text to resolve mentions and formatting
      const processedText = await this.processMessageText(message.text);

      const slackMessage: SlackMessage = {
        id: message.ts,
        channel: channelName || channelId,
        user: userInfo?.name || message.user,
        text: processedText,
        timestamp: message.ts,
        thread_ts: message.thread_ts,
        reply_count: 0,
        type: this.getMessageTypeFromChannel(channelType),
        files: message.files || [],
        reactions: [],
        priority,
        category,
        status: "PENDING" as any,
        context: {
          threadHistory: [],
          userInfo,
        },
      };

      return slackMessage;
    } catch (error) {
      this.logger.error("Error converting message:", error);
      return null;
    }
  }

  private getMessageTypeFromChannel(channelType: string): any {
    switch (channelType) {
      case "im":
        return "DIRECT_MESSAGE";
      case "group":
      case "private_channel":
        return "GROUP_MESSAGE";
      case "channel":
        return "CHANNEL_MESSAGE";
      default:
        return "CHANNEL_MESSAGE";
    }
  }

  private async processMessageText(text: string): Promise<string> {
    if (!text) return text;

    let processedText = text;

    // Replace user mentions <@U123456> with actual names
    const userMentionRegex = /<@([UW][A-Z0-9]+)>/g;
    const userMatches = [...text.matchAll(userMentionRegex)];

    for (const match of userMatches) {
      const userId = match[1];
      try {
        const userInfo = await this.getUserInfo(userId);
        const userName = userInfo?.name || userId;
        processedText = processedText.replace(match[0], `@${userName}`);
      } catch (error) {
        this.logger.debug(`Failed to resolve user ${userId}:`, error);
        // Keep original if resolution fails
      }
    }

    // Replace channel mentions <#C123456|channel-name> with #channel-name
    const channelMentionRegex = /<#([CD][A-Z0-9]+)\|?([^>]*)>/g;
    processedText = processedText.replace(
      channelMentionRegex,
      (match, channelId, channelName) => {
        return channelName ? `#${channelName}` : `#${channelId}`;
      }
    );

    // Clean up other Slack formatting
    processedText = processedText
      .replace(/<!here>/g, "@here")
      .replace(/<!channel>/g, "@channel")
      .replace(/<!everyone>/g, "@everyone");

    return processedText;
  }

  private async getChannelName(channelId: string): Promise<string | null> {
    // Check cache first
    if (this.channelCache.has(channelId)) {
      return this.channelCache.get(channelId) || null;
    }

    return await this.fetchAndCacheChannelName(channelId);
  }

  private async fetchAndCacheChannelName(
    channelId: string
  ): Promise<string | null> {
    if (!this.webClient) return null;

    try {
      const result = await this.webClient.conversations.info({
        channel: channelId,
      });
      if (result.ok && result.channel) {
        const channelName = result.channel.name || channelId;
        this.channelCache.set(channelId, channelName);
        this.logger.debug(
          `Cached channel name: ${channelId} -> ${channelName}`
        );
        return channelName;
      }
    } catch (error) {
      this.logger.debug(`Failed to get channel name for ${channelId}:`, error);
    }

    return null;
  }

  private async fetchAndProcessThreadReplies(
    channelId: string,
    threadTs: string,
    channelType: string
  ): Promise<void> {
    if (!this.webClient) return;

    try {
      const result = await this.webClient.conversations.replies({
        channel: channelId,
        ts: threadTs,
        limit: 50,
      });

      if (result.ok && result.messages) {
        // Skip the first message (that's the original message we already processed)
        const threadReplies = result.messages.slice(1);

        this.logger.info(
          `📨 Found ${threadReplies.length} thread replies for ${threadTs}`
        );

        for (const reply of threadReplies) {
          // Skip bot messages and message subtypes we don't want
          if (reply.bot_id || (reply as any).subtype) {
            this.logger.debug(
              `Skipping thread reply: bot_id=${reply.bot_id}, subtype=${(reply as any).subtype}`
            );
            continue;
          }

          // Convert to our message format and process
          const processedReply = await this.convertToSlackMessage(
            reply,
            channelId,
            channelType
          );
          if (processedReply) {
            this.logger.info(
              `✅ Processing thread reply from ${processedReply.user}: ${processedReply.text.substring(0, 50)}...`
            );
            await this.processMessage(processedReply);
          }
        }
      }
    } catch (error) {
      this.logger.debug(
        `Could not fetch thread replies for ${threadTs}:`,
        error
      );
      // Don't throw error, just log and continue
    }
  }

  private async processMessage(message: SlackMessage): Promise<void> {
    try {
      // Save to database if available
      if (this.databaseService && this.databaseService.isInitialized()) {
        try {
          await this.databaseService.saveMessage(message);
          this.logger.debug(`Message saved to database: ${message.id}`);
        } catch (dbError) {
          this.logger.error("Failed to save message to database:", dbError);
        }
      }

      // Notify message handlers (for real-time UI updates)
      this.notifyMessageHandlers(message);

      this.logger.info(
        `New message processed: ${message.type} from ${message.user} in channel ${message.channel}`
      );
    } catch (error) {
      this.logger.error("Error processing message:", error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.socketClient) return;

    // Handle incoming messages
    this.socketClient.on("message", async (event) => {
      try {
        await this.handleMessage(event);
      } catch (error) {
        this.logger.error("Error handling Slack message:", error);
      }
    });

    // Handle app mentions
    this.socketClient.on("app_mention", async (event) => {
      try {
        await this.handleMessage(event);
      } catch (error) {
        this.logger.error("Error handling Slack app mention:", error);
      }
    });

    // Handle connection events
    this.socketClient.on("connected", () => {
      this.logger.info("Socket Mode connected");
    });

    this.socketClient.on("disconnected", () => {
      this.logger.warn("Socket Mode disconnected");
      this.isConnected = false;
    });

    this.socketClient.on("error", (error) => {
      this.logger.error("Socket Mode error:", error);
    });
  }

  private async handleMessage(event: any): Promise<void> {
    // Skip messages from bots (except our own bot messages if needed)
    if (event.bot_id && !this.shouldProcessBotMessage(event)) {
      return;
    }

    // Skip messages without text or that are too old
    if (!event.text || this.isMessageTooOld(event.ts)) {
      return;
    }

    // Check if we should monitor this channel/message type
    if (!(await this.shouldMonitorMessage(event))) {
      return;
    }

    try {
      // Get user information
      const userInfo = await this.getUserInfo(event.user);

      // Categorize and prioritize the message
      const category = this.categorizeMessage(event.text);
      const priority = this.prioritizeMessage(event.text, category);

      // Create structured message object
      const message: SlackMessage = {
        id: event.ts,
        channel: event.channel,
        user: event.user,
        text: event.text,
        timestamp: event.ts,
        thread_ts: event.thread_ts,
        reply_count: 0,
        type: this.getMessageType(event),
        files: event.files || [],
        reactions: [],
        priority,
        category,
        status: MessageStatus.PENDING,
        context: {
          threadHistory: [],
          userInfo,
        },
      };

      // If it's a thread reply, get thread context
      if (event.thread_ts) {
        message.context!.threadHistory = await this.getThreadHistory(
          event.channel,
          event.thread_ts
        );
      }

      // Save to database if available
      if (this.databaseService && this.databaseService.isInitialized()) {
        try {
          await this.databaseService.saveMessage(message);
          this.logger.debug(`Message saved to database: ${message.id}`);
        } catch (dbError) {
          this.logger.error("Failed to save message to database:", dbError);
        }
      }

      // Notify message handlers (for real-time UI updates)
      this.notifyMessageHandlers(message);

      this.logger.info(
        `New message processed: ${message.type} from ${message.user} in channel ${message.channel}`
      );
    } catch (error) {
      this.logger.error("Error processing Slack message:", error);
    }
  }

  private shouldProcessBotMessage(_event: any): boolean {
    // Add logic to determine if we should process bot messages
    // For now, skip all bot messages
    return false;
  }

  private async shouldMonitorMessage(event: any): Promise<boolean> {
    if (!this.settings) {
      // If no settings, monitor everything (fallback)
      return true;
    }

    // Skip DMs - not supported
    if (event.channel_type === "im") {
      return false;
    }

    // Check if it's an app mention and we should monitor mentions
    if (event.type === "app_mention" && !this.settings.enableMentions) {
      return false;
    }

    // Check if it's a thread reply and we should monitor threads
    if (event.thread_ts && !this.settings.enableThreads) {
      return false;
    }

    // Check channel filtering for public channels
    if (event.channel_type === "channel" || event.channel_type === "group") {
      // Get channel name from channel ID (we'll need to implement this)
      const channelName = await this.getChannelName(event.channel);

      // Check ignored channels
      if (
        this.settings.ignoredChannels.length > 0 &&
        channelName &&
        this.settings.ignoredChannels.includes(channelName)
      ) {
        return false;
      }

      // Check monitored channels (if specified)
      if (
        this.settings.monitoredChannels.length > 0 &&
        channelName &&
        !this.settings.monitoredChannels.includes(channelName)
      ) {
        return false;
      }
    }

    return true;
  }

  private isMessageTooOld(timestamp: string): boolean {
    const messageTime = parseFloat(timestamp) * 1000;
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    return messageTime < fiveMinutesAgo;
  }

  private getMessageType(event: any): SlackMessage["type"] {
    if (event.text && event.text.includes(`<@${event.bot_id}>`)) {
      return "app_mention";
    } else {
      return "message";
    }
  }

  private categorizeMessage(text: string): MessageCategory {
    const lowerText = text.toLowerCase();

    this.logger.debug(`Categorizing message: "${text}"`);
    this.logger.debug(`Available categories: ${this.categoryKeywords.length}`);

    // Use configurable category keywords
    if (this.categoryKeywords && this.categoryKeywords.length > 0) {
      let bestMatch: {
        category: MessageCategory;
        keywordLength: number;
        keyword: string;
      } | null = null;

      // Find the longest/most specific keyword match
      for (const categoryConfig of this.categoryKeywords) {
        this.logger.debug(
          `Checking category: ${categoryConfig.displayName} with keywords: [${categoryConfig.keywords.join(", ")}]`
        );

        for (const keyword of categoryConfig.keywords) {
          const keywordLower = keyword.toLowerCase();
          if (lowerText.includes(keywordLower)) {
            let matchScore = keywordLower.length;

            // Boost score for exact word matches (not just substring)
            const words = lowerText.split(/\s+/);
            if (words.includes(keywordLower)) {
              matchScore += 100; // Big boost for exact word matches
            }

            this.logger.debug(
              `Found match: keyword="${keyword}" in category="${categoryConfig.displayName}" with score=${matchScore}`
            );

            // Prioritize longer, more specific keywords and exact matches
            if (!bestMatch || matchScore > bestMatch.keywordLength) {
              bestMatch = {
                category: categoryConfig.category,
                keywordLength: matchScore,
                keyword,
              };
            }
          }
        }
      }

      if (bestMatch) {
        this.logger.debug(
          `Best match: category="${bestMatch.category}" keyword="${bestMatch.keyword}" score=${bestMatch.keywordLength}`
        );
        return bestMatch.category;
      } else {
        this.logger.debug(
          `No keyword matches found, defaulting to GENERAL_QUESTION`
        );
      }
    } else {
      this.logger.debug(
        `No category keywords configured, defaulting to GENERAL_QUESTION`
      );
    }

    return MessageCategory.GENERAL_QUESTION;
  }

  private prioritizeMessage(
    text: string,
    category: MessageCategory
  ): MessagePriority {
    const lowerText = text.toLowerCase();

    // Urgent indicators
    if (
      lowerText.includes("urgent") ||
      lowerText.includes("emergency") ||
      lowerText.includes("asap")
    ) {
      return MessagePriority.URGENT;
    }

    // High priority categories
    if (
      category === MessageCategory.HARDWARE_ISSUE ||
      category === MessageCategory.VPN_SUPPORT
    ) {
      return MessagePriority.HIGH;
    }

    // Medium priority for access requests and software issues
    if (
      category === MessageCategory.ACCESS_REQUEST ||
      category === MessageCategory.SOFTWARE_INSTALL
    ) {
      return MessagePriority.MEDIUM;
    }

    // Low priority for general questions and password resets (usually self-service)
    return MessagePriority.LOW;
  }

  private async getUserInfo(userId: string): Promise<any> {
    if (!this.webClient) return null;

    try {
      const result = await this.webClient.users.info({ user: userId });
      if (result.ok && result.user) {
        return {
          id: result.user.id,
          name: result.user.real_name || result.user.name,
          email: result.user.profile?.email,
          avatar: result.user.profile?.image_72,
          title: result.user.profile?.title,
          department: (result.user.profile as any)?.fields?.department?.value,
          isBot: result.user.is_bot || false,
        };
      }
    } catch (error) {
      this.logger.error("Error getting user info:", error);
    }

    return null;
  }

  private async getThreadHistory(
    channel: string,
    threadTs: string
  ): Promise<SlackMessage[]> {
    if (!this.webClient) return [];

    try {
      const result = await this.webClient.conversations.replies({
        channel,
        ts: threadTs,
        limit: 10,
      });

      if (result.ok && result.messages) {
        return result.messages.map((msg: any) => ({
          id: msg.ts,
          channel,
          user: msg.user,
          text: msg.text || "",
          timestamp: msg.ts,
          thread_ts: msg.thread_ts,
          reply_count: 0,
          type: "message" as const,
          files: msg.files || [],
          reactions: [],
          priority: MessagePriority.LOW,
          category: MessageCategory.GENERAL_QUESTION,
          status: MessageStatus.PENDING,
        }));
      }
    } catch (error) {
      this.logger.debug(
        `Could not fetch thread history for channel ${channel}, thread ${threadTs}:`,
        error
      );
      // Don't throw error, just return empty array to avoid breaking message processing
    }

    return [];
  }

  public async sendMessage(
    channel: string,
    text: string,
    threadTs?: string
  ): Promise<SlackAPIResponse> {
    if (!this.webClient) {
      throw new Error("Slack client not connected");
    }

    try {
      const result = await this.webClient.chat.postMessage({
        channel,
        text,
        thread_ts: threadTs,
      });

      if (result.ok) {
        this.logger.debug("Message sent to Slack:", { channel, threadTs });
        return { ok: true, data: result };
      } else {
        this.logger.error("Failed to send message to Slack:", result.error);
        return { ok: false, error: result.error };
      }
    } catch (error) {
      this.logger.error("Error sending message to Slack:", error);
      throw error;
    }
  }

  public async updateMessage(
    channel: string,
    ts: string,
    text: string
  ): Promise<SlackAPIResponse> {
    if (!this.webClient) {
      throw new Error("Slack client not connected");
    }

    try {
      const result = await this.webClient.chat.update({
        channel,
        ts,
        text,
      });

      if (result.ok) {
        this.logger.debug("Message updated in Slack:", { channel, ts });
        return { ok: true, data: result };
      } else {
        this.logger.error("Failed to update message in Slack:", result.error);
        return { ok: false, error: result.error };
      }
    } catch (error) {
      this.logger.error("Error updating message in Slack:", error);
      throw error;
    }
  }

  public async addReaction(
    channel: string,
    timestamp: string,
    name: string
  ): Promise<SlackAPIResponse> {
    if (!this.webClient) {
      throw new Error("Slack client not connected");
    }

    try {
      const result = await this.webClient.reactions.add({
        channel,
        timestamp,
        name,
      });

      if (result.ok) {
        this.logger.debug("Reaction added to Slack message:", {
          channel,
          timestamp,
          name,
        });
        return { ok: true, data: result };
      } else {
        this.logger.error(
          "Failed to add reaction to Slack message:",
          result.error
        );
        return { ok: false, error: result.error };
      }
    } catch (error) {
      this.logger.error("Error adding reaction to Slack message:", error);
      throw error;
    }
  }

  public async getChannels(): Promise<any[]> {
    if (!this.webClient) {
      throw new Error("Slack client not connected");
    }

    try {
      const result = await this.webClient.conversations.list({
        types: "public_channel,private_channel",
        limit: 1000,
      });

      if (result.ok && result.channels) {
        return result.channels.map((channel: any) => ({
          id: channel.id,
          name: channel.name,
          isPrivate: channel.is_private,
          isMember: channel.is_member,
          topic: channel.topic?.value,
          purpose: channel.purpose?.value,
        }));
      }
    } catch (error) {
      this.logger.error("Error getting Slack channels:", error);
    }

    return [];
  }

  public async getUsers(): Promise<any[]> {
    if (!this.webClient) {
      throw new Error("Slack client not connected");
    }

    try {
      const result = await this.webClient.users.list({
        limit: 1000,
      });

      if (result.ok && result.members) {
        return result.members
          .filter((user: any) => !user.deleted && !user.is_bot)
          .map((user: any) => ({
            id: user.id,
            name: user.real_name || user.name,
            email: user.profile?.email,
            avatar: user.profile?.image_72,
            title: user.profile?.title,
            department: (user.profile as any)?.fields?.department?.value,
            isBot: user.is_bot || false,
          }));
      }
    } catch (error) {
      this.logger.error("Error getting Slack users:", error);
    }

    return [];
  }

  // Message handler registration
  public onMessage(handler: (message: SlackMessage) => void): void {
    this.messageHandlers.push(handler);
  }

  public removeMessageHandler(handler: (message: SlackMessage) => void): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  private notifyMessageHandlers(message: SlackMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        this.logger.error("Error in message handler:", error);
      }
    });
  }

  // Utility methods
  public async markAsRead(channel: string, ts: string): Promise<void> {
    if (!this.webClient) return;

    try {
      await this.webClient.conversations.mark({
        channel,
        ts,
      });
    } catch (error) {
      this.logger.error("Error marking message as read:", error);
    }
  }

  public async setPresence(presence: "away" | "auto"): Promise<void> {
    if (!this.webClient) return;

    try {
      await this.webClient.users.setPresence({ presence });
    } catch (error) {
      this.logger.error("Error setting presence:", error);
    }
  }

  public async testConnection(): Promise<boolean> {
    if (!this.webClient) return false;

    try {
      const result = await this.webClient.auth.test();
      return result.ok || false;
    } catch (error) {
      this.logger.error("Error testing Slack connection:", error);
      return false;
    }
  }
}
