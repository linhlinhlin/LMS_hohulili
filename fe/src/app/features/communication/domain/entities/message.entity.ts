import {
  MessageId,
  ConversationId,
  UserId,
  MessageType,
  MessageStatus,
  ValidationResult,
  MessageMetadata
} from '../types';
import { MessageContent } from '../value-objects/message-content';

/**
 * Domain Entity: Message
 * Represents a message in the communication domain with rich business logic
 */
export class Message {
  constructor(
    public readonly id: MessageId,
    public readonly conversationId: ConversationId,
    public readonly senderId: UserId,
    public readonly content: MessageContent,
    public readonly messageType: MessageType,
    public readonly status: MessageStatus,
    public readonly metadata: MessageMetadata
  ) {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid message: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Business Logic Methods
   */

  /**
   * Check if message is sent
   */
  public isSent(): boolean {
    return this.status === MessageStatus.SENT;
  }

  /**
   * Check if message is delivered
   */
  public isDelivered(): boolean {
    return this.status === MessageStatus.DELIVERED;
  }

  /**
   * Check if message is read
   */
  public isRead(): boolean {
    return this.status === MessageStatus.READ;
  }

  /**
   * Check if message failed to send
   */
  public isFailed(): boolean {
    return this.status === MessageStatus.FAILED;
  }

  /**
   * Check if message is a text message
   */
  public isTextMessage(): boolean {
    return this.messageType === MessageType.TEXT;
  }

  /**
   * Check if message is a system message
   */
  public isSystemMessage(): boolean {
    return this.messageType === MessageType.SYSTEM;
  }

  /**
   * Check if message is an announcement
   */
  public isAnnouncement(): boolean {
    return this.messageType === MessageType.ANNOUNCEMENT;
  }

  /**
   * Check if message has attachments
   */
  public hasAttachments(): boolean {
    return this.metadata.attachments.length > 0;
  }

  /**
   * Check if message has reactions
   */
  public hasReactions(): boolean {
    return this.metadata.reactions.length > 0;
  }

  /**
   * Check if message mentions users
   */
  public hasMentions(): boolean {
    return this.metadata.mentions.length > 0;
  }

  /**
   * Check if message is a reply
   */
  public isReply(): boolean {
    return !!this.metadata.replyToMessageId;
  }

  /**
   * Check if message is forwarded
   */
  public isForwarded(): boolean {
    return !!this.metadata.forwardedFromMessageId;
  }

  /**
   * Check if message is edited
   */
  public isEdited(): boolean {
    return !!this.metadata.editedAt;
  }

  /**
   * Get message content as string
   */
  public getContent(): string {
    return this.content.getValue();
  }

  /**
   * Get message preview
   */
  public getPreview(maxLength: number = 100): string {
    return this.content.getPreview(maxLength);
  }

  /**
   * Get message length
   */
  public getLength(): number {
    return this.content.getLength();
  }

  /**
   * Check if message is recent
   */
  public isRecent(minutesThreshold: number = 5): boolean {
    const now = new Date();
    const messageTime = this.metadata.createdAt;
    const diffMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60);
    return diffMinutes <= minutesThreshold;
  }

  /**
   * Get message age in minutes
   */
  public getAgeInMinutes(): number {
    const now = new Date();
    const messageTime = this.metadata.createdAt;
    return Math.floor((now.getTime() - messageTime.getTime()) / (1000 * 60));
  }

  /**
   * Check if message contains URLs
   */
  public containsUrls(): boolean {
    return this.content.containsUrls();
  }

  /**
   * Get URLs from message
   */
  public getUrls(): string[] {
    return this.content.extractUrls();
  }

  /**
   * Check if message is a question
   */
  public isQuestion(): boolean {
    return this.content.isQuestion();
  }

  /**
   * Get message sentiment
   */
  public getSentiment(): 'positive' | 'negative' | 'neutral' {
    return this.content.getSentiment();
  }

  /**
   * Get message priority based on content and type
   */
  public getPriority(): 'low' | 'normal' | 'high' | 'urgent' {
    // Announcements are always high priority
    if (this.isAnnouncement()) return 'high';

    // System messages are urgent
    if (this.isSystemMessage()) return 'urgent';

    // Messages with mentions are high priority
    if (this.hasMentions()) return 'high';

    // Questions might be more important
    if (this.isQuestion()) return 'normal';

    // Messages with attachments are normal priority
    if (this.hasAttachments()) return 'normal';

    return 'low';
  }

  /**
   * Check if message can be edited
   */
  public canBeEdited(editWindowMinutes: number = 15): boolean {
    if (this.isSystemMessage() || this.isAnnouncement()) return false;

    const ageMinutes = this.getAgeInMinutes();
    return ageMinutes <= editWindowMinutes;
  }

  /**
   * Check if message can be deleted
   */
  public canBeDeleted(deleteWindowMinutes: number = 60): boolean {
    if (this.isSystemMessage() || this.isAnnouncement()) return false;

    const ageMinutes = this.getAgeInMinutes();
    return ageMinutes <= deleteWindowMinutes;
  }

  /**
   * Get reaction count for specific emoji
   */
  public getReactionCount(emoji: string): number {
    return this.metadata.reactions.filter(reaction => reaction.emoji === emoji).length;
  }

  /**
   * Check if user reacted with specific emoji
   */
  public hasUserReaction(userId: UserId, emoji: string): boolean {
    return this.metadata.reactions.some(
      reaction => reaction.userId === userId && reaction.emoji === emoji
    );
  }

  /**
   * Get unique reaction emojis
   */
  public getUniqueReactions(): string[] {
    const emojis = this.metadata.reactions.map(reaction => reaction.emoji);
    return [...new Set(emojis)];
  }

  /**
   * Get formatted message info
   */
  public getFormattedInfo(): {
    id: string;
    content: string;
    type: string;
    status: string;
    priority: string;
    hasAttachments: boolean;
    hasReactions: boolean;
    isEdited: boolean;
    isReply: boolean;
    age: number;
  } {
    return {
      id: this.id,
      content: this.getPreview(),
      type: this.getTypeLabel(),
      status: this.getStatusLabel(),
      priority: this.getPriority(),
      hasAttachments: this.hasAttachments(),
      hasReactions: this.hasReactions(),
      isEdited: this.isEdited(),
      isReply: this.isReply(),
      age: this.getAgeInMinutes()
    };
  }

  /**
   * Get type label in Vietnamese
   */
  private getTypeLabel(): string {
    switch (this.messageType) {
      case MessageType.TEXT: return 'Văn bản';
      case MessageType.IMAGE: return 'Hình ảnh';
      case MessageType.FILE: return 'Tệp tin';
      case MessageType.LINK: return 'Liên kết';
      case MessageType.SYSTEM: return 'Hệ thống';
      case MessageType.ANNOUNCEMENT: return 'Thông báo';
      default: return 'Không xác định';
    }
  }

  /**
   * Get status label in Vietnamese
   */
  private getStatusLabel(): string {
    switch (this.status) {
      case MessageStatus.SENT: return 'Đã gửi';
      case MessageStatus.DELIVERED: return 'Đã nhận';
      case MessageStatus.READ: return 'Đã đọc';
      case MessageStatus.FAILED: return 'Thất bại';
      default: return 'Không xác định';
    }
  }

  /**
   * Validate message data
   */
  public validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Content validation is handled by MessageContent value object

    if (this.metadata.createdAt > new Date()) {
      errors.push('Message creation date cannot be in the future');
    }

    if (this.metadata.editedAt && this.metadata.editedAt < this.metadata.createdAt) {
      errors.push('Edited date cannot be before creation date');
    }

    // Business rule validations
    if (this.messageType === MessageType.SYSTEM && this.senderId) {
      warnings.push('System messages should not have a sender');
    }

    if (this.messageType === MessageType.ANNOUNCEMENT && !this.hasAttachments() && this.content.getLength() < 50) {
      warnings.push('Announcements should be more detailed');
    }

    if (this.isReply() && !this.metadata.replyToMessageId) {
      errors.push('Reply message must have replyToMessageId');
    }

    if (this.isForwarded() && !this.metadata.forwardedFromMessageId) {
      errors.push('Forwarded message must have forwardedFromMessageId');
    }

    // Check for spam-like content
    if (this.content.isAllCaps() && this.content.getLength() > 20) {
      warnings.push('All caps messages may be considered shouting');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create a copy with updated status
   */
  public withStatus(newStatus: MessageStatus): Message {
    return new Message(
      this.id,
      this.conversationId,
      this.senderId,
      this.content,
      this.messageType,
      newStatus,
      {
        ...this.metadata,
        updatedAt: new Date()
      }
    );
  }

  /**
   * Create a copy with updated content (for editing)
   */
  public withContent(newContent: MessageContent): Message {
    return new Message(
      this.id,
      this.conversationId,
      this.senderId,
      newContent,
      this.messageType,
      this.status,
      {
        ...this.metadata,
        editedAt: new Date(),
        updatedAt: new Date()
      }
    );
  }

  /**
   * Create a copy with added reaction
   */
  public withAddedReaction(emoji: string, userId: UserId): Message {
    const newReaction = {
      emoji,
      userId,
      createdAt: new Date()
    };

    return new Message(
      this.id,
      this.conversationId,
      this.senderId,
      this.content,
      this.messageType,
      this.status,
      {
        ...this.metadata,
        reactions: [...this.metadata.reactions, newReaction],
        updatedAt: new Date()
      }
    );
  }

  /**
   * Create a copy with removed reaction
   */
  public withRemovedReaction(emoji: string, userId: UserId): Message {
    const filteredReactions = this.metadata.reactions.filter(
      reaction => !(reaction.emoji === emoji && reaction.userId === userId)
    );

    return new Message(
      this.id,
      this.conversationId,
      this.senderId,
      this.content,
      this.messageType,
      this.status,
      {
        ...this.metadata,
        reactions: filteredReactions,
        updatedAt: new Date()
      }
    );
  }
}