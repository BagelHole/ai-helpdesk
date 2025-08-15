import { WebClient } from "@slack/web-api";
import { SocketModeClient } from "@slack/socket-mode";
import { Logger } from "./logger-service";
import {
  SlackMessage,
  MessagePriority,
  MessageCategory,
  MessageStatus,
  SlackAPIResponse,
} from "@shared/types";

export class SlackService {
  private webClient: WebClient | null = null;
  private socketClient: SocketModeClient | null = null;
  private logger: Logger;
  private isConnected = false;
  private messageHandlers: ((message: SlackMessage) => void)[] = [];

  constructor() {
    this.logger = new Logger();
  }

  public async connect(botToken: string, appToken?: string): Promise<void> {
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

      // Initialize Socket Mode client if app token is provided
      if (appToken) {
        this.socketClient = new SocketModeClient({
          appToken,
        });

        // Set up event handlers
        this.setupEventHandlers();

        // Start socket connection
        await this.socketClient.start();
        this.logger.info("Socket Mode connection established");
      }

      this.isConnected = true;
    } catch (error) {
      this.logger.error("Failed to connect to Slack:", error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
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

      // Notify message handlers
      this.notifyMessageHandlers(message);
    } catch (error) {
      this.logger.error("Error processing Slack message:", error);
    }
  }

  private shouldProcessBotMessage(event: any): boolean {
    // Add logic to determine if we should process bot messages
    // For now, skip all bot messages
    return false;
  }

  private isMessageTooOld(timestamp: string): boolean {
    const messageTime = parseFloat(timestamp) * 1000;
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    return messageTime < fiveMinutesAgo;
  }

  private getMessageType(event: any): SlackMessage["type"] {
    if (event.channel_type === "im") {
      return "direct_message";
    } else if (event.text && event.text.includes(`<@${event.bot_id}>`)) {
      return "app_mention";
    } else {
      return "message";
    }
  }

  private categorizeMessage(text: string): MessageCategory {
    const lowerText = text.toLowerCase();

    // Password related
    if (
      lowerText.includes("password") ||
      lowerText.includes("login") ||
      lowerText.includes("access")
    ) {
      return MessageCategory.PASSWORD_RESET;
    }

    // VPN related
    if (
      lowerText.includes("vpn") ||
      lowerText.includes("connection") ||
      lowerText.includes("network")
    ) {
      return MessageCategory.VPN_SUPPORT;
    }

    // Software installation
    if (
      lowerText.includes("install") ||
      lowerText.includes("software") ||
      lowerText.includes("app")
    ) {
      return MessageCategory.SOFTWARE_INSTALL;
    }

    // Hardware issues
    if (
      lowerText.includes("computer") ||
      lowerText.includes("laptop") ||
      lowerText.includes("hardware") ||
      lowerText.includes("device")
    ) {
      return MessageCategory.HARDWARE_ISSUE;
    }

    // Access requests
    if (
      lowerText.includes("permission") ||
      lowerText.includes("access to") ||
      lowerText.includes("need access")
    ) {
      return MessageCategory.ACCESS_REQUEST;
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
      this.logger.error("Error getting thread history:", error);
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
