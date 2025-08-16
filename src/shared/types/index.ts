// Base Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  title?: string;
  department?: string;
  isBot?: boolean;
}

export interface SlackMessage {
  id: string;
  channel: string;
  user: string;
  text: string;
  timestamp: string;
  thread_ts?: string;
  reply_count?: number;
  type: "message" | "app_mention";
  files?: SlackFile[];
  reactions?: SlackReaction[];
  priority: MessagePriority;
  category: MessageCategory;
  status: MessageStatus;
  context?: MessageContext;
}

export interface SlackFile {
  id: string;
  name: string;
  mimetype: string;
  url_private: string;
  size: number;
}

export interface SlackReaction {
  name: string;
  count: number;
  users: string[];
}

export interface MessageContext {
  threadHistory: SlackMessage[];
  userInfo: User;
  deviceInfo?: DeviceInfo;
  relatedTickets?: string[];
  previousInteractions?: string[];
}

export interface DeviceInfo {
  id: string;
  userId: string;
  deviceName: string;
  operatingSystem: string;
  osVersion: string;
  model: string;
  serialNumber?: string;
  macAddress?: string;
  ipAddress?: string;
  lastSeen: string;
  applications: InstalledApplication[];
  specifications: DeviceSpecifications;
}

export interface InstalledApplication {
  name: string;
  version: string;
  vendor: string;
  installDate: string;
  category: string;
}

export interface DeviceSpecifications {
  cpu: string;
  memory: string;
  storage: string;
  gpu?: string;
  networkAdapters: string[];
}

export interface RipplingUser {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  department: string;
  manager?: string;
  startDate: string;
  status: "active" | "inactive" | "terminated";
  workLocation: string;
  phoneNumber?: string;
  devices: DeviceInfo[];
}

export interface AIResponse {
  id: string;
  messageId: string;
  provider: AIProvider;
  model: string;
  response: string;
  confidence: number;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  timestamp: string;
  isEdited: boolean;
  originalResponse?: string;
  status: "pending" | "generated" | "sent" | "failed";
}

export interface AIProvider {
  id: string;
  name: string;
  type: "openai" | "anthropic" | "google" | "ollama" | "custom";
  apiKey?: string;
  baseUrl?: string;
  models: AIModel[];
  isEnabled: boolean;
  rateLimits: RateLimit;
}

export interface AIModel {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
  costPer1kTokens: number;
  isDefault?: boolean;
}

export interface RateLimit {
  requestsPerMinute: number;
  requestsPerDay: number;
  tokensPerMinute: number;
  tokensPerDay: number;
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  variables: PromptVariable[];
  category: PromptCategory;
  isDefault: boolean;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
  tags: string[];
}

export interface PromptVariable {
  name: string;
  description: string;
  type: "string" | "number" | "boolean" | "object";
  defaultValue?: any;
  required: boolean;
}

export interface AppSettings {
  slack: SlackSettings;
  rippling: RipplingSettings;
  ai: AISettings;
  ui: UISettings;
  security: SecuritySettings;
  notifications: NotificationSettings;
  automation: AutomationSettings;
}

export interface SlackSettings {
  botToken?: string;
  appToken?: string;
  userToken?: string;
  workspaceId?: string;
  monitoredChannels: string[];
  ignoredChannels: string[];
  enableMentions: boolean;
  enableThreads: boolean;
  autoMarkAsRead: boolean;
}

export interface RipplingSettings {
  apiKey?: string;
  baseUrl?: string;
  syncInterval: number; // minutes
  cacheExpiry: number; // hours
  enableUserSync: boolean;
  enableDeviceSync: boolean;
  enableApplicationSync: boolean;
}

export interface CategoryKeywords {
  category: MessageCategory;
  keywords: string[];
  displayName: string;
  description?: string;
}

export interface CustomSystemPrompt {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AISettings {
  providers: AIProvider[];
  defaultProvider: string;
  systemPrompts: SystemPrompt[];
  defaultPrompt: string;
  customSystemPrompts: CustomSystemPrompt[];
  activeSystemPrompt: string; // ID of the active custom prompt
  autoResponseEnabled: boolean;
  confidenceThreshold: number;
  maxTokensPerResponse: number;
  temperature: number;
  enableLocalModels: boolean;
  ollamaUrl?: string;
  categoryKeywords: CategoryKeywords[];
}

export interface UISettings {
  theme: "light" | "dark" | "system";
  language: string;
  fontSize: number;
  compactMode: boolean;
  showAvatars: boolean;
  enableAnimations: boolean;
  windowSize: { width: number; height: number };
  windowPosition: { x: number; y: number };
}

export interface SecuritySettings {
  encryptLocalData: boolean;
  requireAuth: boolean;
  sessionTimeout: number; // minutes
  enableAuditLog: boolean;
  dataRetentionDays: number;
  allowRemoteAI: boolean;
  enableProxy: boolean;
  proxyUrl?: string;
}

export interface NotificationSettings {
  enableDesktopNotifications: boolean;
  enableSounds: boolean;
  soundVolume: number;
  notifyOnNewMessage: boolean;
  notifyOnAIResponse: boolean;
  notifyOnError: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface AutomationSettings {
  enableAutoResponse: boolean;
  autoResponseRules: AutoResponseRule[];
  enableAutoEscalation: boolean;
  escalationRules: EscalationRule[];
  enableBatchProcessing: boolean;
  batchSize: number;
  processingInterval: number; // minutes
}

export interface AutoResponseRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  action: "auto_respond" | "suggest" | "escalate" | "ignore";
  promptId: string;
  isEnabled: boolean;
  priority: number;
}

export interface EscalationRule {
  id: string;
  name: string;
  conditions: RuleCondition[];
  escalateTo: string; // user ID or channel
  urgency: "low" | "medium" | "high" | "critical";
  isEnabled: boolean;
}

export interface RuleCondition {
  field:
    | "message_text"
    | "user_id"
    | "channel_id"
    | "time"
    | "keywords"
    | "priority";
  operator:
    | "contains"
    | "equals"
    | "starts_with"
    | "ends_with"
    | "regex"
    | "greater_than"
    | "less_than";
  value: string | number | boolean;
}

export interface Analytics {
  totalMessages: number;
  messagesProcessed: number;
  autoResponses: number;
  manualResponses: number;
  averageResponseTime: number;
  userSatisfactionScore: number;
  costPerMonth: number;
  tokensUsed: number;
  topCategories: CategoryStats[];
  responseEffectiveness: EffectivenessStats[];
}

export interface CategoryStats {
  category: MessageCategory;
  count: number;
  averageResponseTime: number;
  successRate: number;
}

export interface EffectivenessStats {
  promptId: string;
  promptName: string;
  usageCount: number;
  averageConfidence: number;
  editRate: number;
  userRating: number;
}

// Enums
export enum MessagePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export enum MessageCategory {
  PASSWORD_RESET = "password_reset",
  VPN_SUPPORT = "vpn_support",
  SOFTWARE_INSTALL = "software_install",
  HARDWARE_ISSUE = "hardware_issue",
  ACCESS_REQUEST = "access_request",
  GENERAL_QUESTION = "general_question",
  ESCALATION = "escalation",
  OTHER = "other",
}

export enum MessageStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  RESPONDED = "responded",
  ESCALATED = "escalated",
  IGNORED = "ignored",
  FAILED = "failed",
}

export enum PromptCategory {
  IT_SUPPORT = "it_support",
  GENERAL = "general",
  CUSTOM = "custom",
  TROUBLESHOOTING = "troubleshooting",
  ONBOARDING = "onboarding",
}

// IPC Types
export interface IPCMessage<T = any> {
  type: string;
  data?: T;
  requestId?: string;
}

export interface IPCResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

// Database Types
export interface DatabaseMessage extends Omit<SlackMessage, "id"> {
  id?: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseUser extends Omit<User, "id"> {
  id?: number;
  slack_id: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAIResponse extends Omit<AIResponse, "id"> {
  id?: number;
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface SlackAPIResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  warning?: string;
}

export interface RipplingAPIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
