// Domain Types for Communication Feature
// Following Domain-Driven Design principles

export type MessageId = string & { readonly __brand: 'MessageId' };
export type ConversationId = string & { readonly __brand: 'ConversationId' };
export type ParticipantId = string & { readonly __brand: 'ParticipantId' };
export type UserId = string & { readonly __brand: 'UserId' };
export type CourseId = string & { readonly __brand: 'CourseId' };

// Message Types
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  LINK = 'link',
  SYSTEM = 'system',
  ANNOUNCEMENT = 'announcement'
}

// Conversation Types
export enum ConversationType {
  DIRECT = 'direct',           // 1-on-1 conversation
  GROUP = 'group',            // Group chat
  COURSE_FORUM = 'course_forum', // Course-specific forum
  ANNOUNCEMENT = 'announcement' // System announcements
}

// Message Status
export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

// Conversation Status
export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  MUTED = 'muted',
  DELETED = 'deleted'
}

// Participant Role
export enum ParticipantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member'
}

// Notification Types
export enum NotificationType {
  MESSAGE = 'message',
  MENTION = 'mention',
  REPLY = 'reply',
  ANNOUNCEMENT = 'announcement',
  SYSTEM = 'system'
}

// Priority Levels
export enum PriorityLevel {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Validation Results
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Communication Statistics
export interface CommunicationStatistics {
  totalMessages: number;
  totalConversations: number;
  activeConversations: number;
  unreadMessages: number;
  totalParticipants: number;
  messagesToday: number;
  mostActiveConversation: {
    conversationId: ConversationId;
    messageCount: number;
  };
}

// Message Filters
export interface MessageFilters {
  conversationId?: ConversationId;
  senderId?: UserId;
  messageType?: MessageType[];
  status?: MessageStatus[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasAttachments?: boolean;
  searchQuery?: string;
}

// Conversation Filters
export interface ConversationFilters {
  type?: ConversationType[];
  status?: ConversationStatus[];
  participantId?: UserId;
  courseId?: CourseId;
  isMuted?: boolean;
  hasUnreadMessages?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

// Sort Options
export interface CommunicationSortOptions {
  field: 'createdAt' | 'updatedAt' | 'lastMessageAt' | 'messageCount' | 'participantCount';
  direction: 'asc' | 'desc';
}

// Pagination
export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// File Attachment
export interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'document' | 'video' | 'audio' | 'other';
  size: number;
  uploadedAt: Date;
  uploadedBy: UserId;
}

// Message Reactions
export interface MessageReaction {
  emoji: string;
  userId: UserId;
  createdAt: Date;
}

// Message Metadata
export interface MessageMetadata {
  createdAt: Date;
  updatedAt: Date;
  editedAt?: Date;
  editedBy?: UserId;
  replyToMessageId?: MessageId;
  forwardedFromMessageId?: MessageId;
  reactions: MessageReaction[];
  attachments: FileAttachment[];
  mentions: UserId[];
  tags: string[];
}

// Conversation Settings
export interface ConversationSettings {
  isPublic: boolean;
  allowInvites: boolean;
  allowFileUploads: boolean;
  allowReactions: boolean;
  messageRetentionDays?: number;
  maxParticipants?: number;
  moderationEnabled: boolean;
}