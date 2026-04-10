/**
 * Message Utilities for Student Messaging System
 *
 * Utility functions for message handling, sorting, filtering, and calculations.
 * Used by both Student Inbox and Teacher Messages Tab.
 *
 * @requirements 1.4, 2.4, 2.5, 4.1
 */

// Types
/**
 * File attachment interface for future implementation
 * @future Reserved for file attachment feature
 */
export interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
}

/** Message delivery status — WhatsApp/Telegram pattern */
export type MessageStatus = 'sending' | 'sent' | 'read' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';
  content: string;
  assignmentReference?: {
    assignmentId: string;
    assignmentTitle: string;
    courseId: string;
    courseName: string;
  };
  /**
   * File attachments - reserved for future implementation
   * @future Will support images, PDFs, and documents
   */
  attachments?: MessageAttachment[];
  isRead: boolean;
  /** Delivery status for own messages: sending → sent → read */
  status?: MessageStatus;
  /** Emoji reactions on this message (Slack/Messenger pattern) */
  reactions?: MessageReaction[];
  /** Message has been recalled/unsent (Messenger pattern) */
  recalled?: boolean;
  /** Reply reference (Messenger quote-reply) */
  replyToId?: string;
  replyTo?: { id: string; senderName: string; content: string };
  createdAt: string;
  readAt?: string;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface Conversation {
  id: string;
  participants: {
    id: string;
    name: string;
    role: 'ADMIN' | 'ORG_ADMIN' | 'TEACHER' | 'STUDENT';
    avatar?: string;
  }[];
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: string;
  };
  unreadCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListItem {
  conversationId: string;
  otherParticipant: {
    id: string;
    name: string;
    role?: string;
    avatar?: string;
  };
  lastMessagePreview: string;
  lastMessageTime: string;
  unreadCount: number;
  isArchived: boolean;
  /** True if the last message was sent by current user */
  isOwnLastMessage?: boolean;
}

/**
 * Sort messages by date in chronological order (oldest first)
 *
 * @param messages - Array of messages to sort
 * @returns Sorted array with oldest messages first
 *
 * **Feature: teacher-student-messaging, Property 2: Message Chronological Order**
 */
export function sortMessagesByDate(messages: Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateA - dateB; // Ascending order (oldest first)
  });
}

/**
 * Calculate unread count for a conversation
 *
 * @param messages - Array of messages in the conversation
 * @param currentUserId - ID of the current user
 * @returns Number of unread messages
 *
 * **Feature: teacher-student-messaging, Property 4: Unread Count Accuracy**
 */
export function calculateUnreadCount(
  messages: Message[],
  currentUserId: string
): number {
  return messages.filter(
    (msg) => !msg.isRead && msg.senderId !== currentUserId
  ).length;
}


/**
 * Calculate total unread count across all conversations
 *
 * @param conversations - Array of conversations
 * @returns Total number of unread messages
 */
export function calculateTotalUnreadCount(conversations: Conversation[]): number {
  return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
}

/**
 * Format message preview for conversation list
 * Truncates long messages and adds ellipsis
 *
 * @param content - Full message content
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Truncated message preview
 */
export function formatMessagePreview(
  content: string,
  maxLength: number = 50
): string {
  if (!content) return '';
  const trimmed = content.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.substring(0, maxLength).trim() + '...';
}

/**
 * Filter conversations by search query
 * Searches in participant names and last message content
 *
 * @param conversations - Array of conversations to filter
 * @param query - Search query string
 * @param currentUserId - ID of the current user (to find other participant)
 * @returns Filtered array of conversations
 *
 * **Feature: teacher-student-messaging, Property 6: Search Results Relevance**
 */
export function filterConversationsBySearch(
  conversations: Conversation[],
  query: string,
  currentUserId: string
): Conversation[] {
  if (!query || query.trim() === '') {
    return conversations;
  }

  const lowerQuery = query.toLowerCase().trim();

  return conversations.filter((conv) => {
    // Search in participant names (excluding current user)
    const otherParticipants = conv.participants.filter(
      (p) => p.id !== currentUserId
    );
    const nameMatch = otherParticipants.some((p) =>
      p.name.toLowerCase().includes(lowerQuery)
    );

    // Search in last message content
    const messageMatch = conv.lastMessage?.content
      ?.toLowerCase()
      .includes(lowerQuery);

    return nameMatch || messageMatch;
  });
}

/**
 * Sort conversations by most recent message (newest first)
 *
 * @param conversations - Array of conversations to sort
 * @returns Sorted array with most recent conversations first
 *
 * **Feature: teacher-student-messaging, Property 8: Conversation Sort Order**
 */
export function sortConversationsByRecent(
  conversations: Conversation[]
): Conversation[] {
  return [...conversations].sort((a, b) => {
    const dateA = a.lastMessage
      ? new Date(a.lastMessage.createdAt).getTime()
      : new Date(a.updatedAt).getTime();
    const dateB = b.lastMessage
      ? new Date(b.lastMessage.createdAt).getTime()
      : new Date(b.updatedAt).getTime();
    return dateB - dateA; // Descending order (newest first)
  });
}

/**
 * Filter out empty conversations (no messages)
 *
 * @param conversations - Array of conversations
 * @returns Filtered array excluding empty conversations
 *
 * **Feature: teacher-student-messaging, Property 10: Empty Conversation Filtering**
 */
export function filterEmptyConversations(
  conversations: Conversation[]
): Conversation[] {
  return conversations.filter((conv) => conv.lastMessage !== undefined);
}

/**
 * Get the other participant in a conversation (not the current user)
 *
 * @param conversation - The conversation
 * @param currentUserId - ID of the current user
 * @returns The other participant or undefined
 */
export function getOtherParticipant(
  conversation: Conversation,
  currentUserId: string
): Conversation['participants'][0] | undefined {
  return conversation.participants.find((p) => p.id !== currentUserId);
}

/**
 * Convert Conversation to ConversationListItem for display
 *
 * @param conversation - The conversation to convert
 * @param currentUserId - ID of the current user
 * @returns ConversationListItem for display
 */
export function toConversationListItem(
  conversation: Conversation,
  currentUserId: string
): ConversationListItem {
  const otherParticipant = getOtherParticipant(conversation, currentUserId);

  const isOwnLastMessage = conversation.lastMessage?.senderId === currentUserId;

  return {
    conversationId: conversation.id,
    otherParticipant: otherParticipant
      ? {
          id: otherParticipant.id,
          name: otherParticipant.name,
          role: otherParticipant.role,
          avatar: otherParticipant.avatar,
        }
      : { id: '', name: 'Unknown', avatar: undefined },
    lastMessagePreview: formatMessagePreview(
      conversation.lastMessage?.content || ''
    ),
    lastMessageTime: conversation.lastMessage?.createdAt || conversation.updatedAt,
    unreadCount: conversation.unreadCount,
    isArchived: conversation.isArchived,
    isOwnLastMessage,
  };
}

/**
 * Format timestamp for display
 *
 * @param dateString - ISO date string
 * @returns Formatted date string in Vietnamese locale
 */
export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format full date+time for hover tooltip (Messenger pattern)
 * E.g., "Thứ hai, 08/04/2026 lúc 23:14"
 */
export function formatFullDateTime(dateString: string): string {
  const date = new Date(dateString);
  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const day = dayNames[date.getDay()];
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${day}, ${dd}/${mm}/${yyyy} lúc ${hh}:${mi}`;
}

/**
 * Format date separator label between message groups (Messenger pattern)
 * - Today → "Hôm nay"
 * - Yesterday → "Hôm qua"
 * - This year → "Thứ X, DD tháng MM"
 * - Older → "DD/MM/YYYY"
 */
export function formatDateSeparator(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';

  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const dd = String(date.getDate()).padStart(2, '0');

  if (date.getFullYear() === now.getFullYear()) {
    return `${dayNames[date.getDay()]}, ${dd} tháng ${monthNames[date.getMonth()]}`;
  }

  return `${dd}/${monthNames[date.getMonth()]}/${date.getFullYear()}`;
}

/**
 * Check if two messages are on different days (for date separator rendering)
 */
export function isDifferentDay(dateA: string, dateB: string): boolean {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return a.getFullYear() !== b.getFullYear() ||
    a.getMonth() !== b.getMonth() ||
    a.getDate() !== b.getDate();
}

/**
 * Check if a message contains an assignment reference
 *
 * @param message - The message to check
 * @returns true if message has assignment reference
 */
export function hasAssignmentReference(message: Message): boolean {
  if (!message || !message.assignmentReference) return false;
  return message.assignmentReference.assignmentId !== '';
}

/**
 * URL regex pattern for detecting links in text
 * Matches http, https, and www URLs
 */
const URL_PATTERN = /(\bhttps?:\/\/[^\s<>[\]{}|\\^`"']+|\bwww\.[^\s<>[\]{}|\\^`"']+)/gi;

/**
 * Represents a segment of text that may or may not be a link
 */
export interface TextSegment {
  type: 'text' | 'link';
  content: string;
  url?: string;
}

/**
 * Parse message content and detect URLs
 * Returns an array of text segments (plain text or links)
 *
 * @param content - Message content to parse
 * @returns Array of text segments
 *
 * @security Uses safe parsing without innerHTML to prevent XSS
 */
export function parseMessageWithLinks(content: string): TextSegment[] {
  if (!content) return [];

  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  URL_PATTERN.lastIndex = 0;

  while ((match = URL_PATTERN.exec(content)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: content.substring(lastIndex, match.index),
      });
    }

    // Add the URL
    let url = match[0];
    // Ensure URL has protocol
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    }

    segments.push({
      type: 'link',
      content: match[0],
      url: url,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last URL
  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      content: content.substring(lastIndex),
    });
  }

  // If no URLs found, return single text segment
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      content: content,
    });
  }

  return segments;
}

/**
 * Check if a message is emoji-only (1–6 emoji, no other text).
 * Emoji-only messages render LARGE (32–40px) without bubble background.
 *
 * @param text - Message content
 * @returns true if text contains only emoji (max 6 grapheme clusters)
 */
export function isEmojiOnly(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  // Match sequences of emoji presentation, extended pictographic, variation selectors, ZWJ, and whitespace
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|\uFE0F|\u200D|\s)+$/u;
  if (!emojiRegex.test(trimmed)) return false;
  // Count actual emoji grapheme clusters (filter out whitespace/joiners)
  const clusters = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed)]
    .map(s => s.segment.trim())
    .filter(s => s.length > 0);
  return clusters.length >= 1 && clusters.length <= 6;
}

/**
 * Check if content contains any URLs
 *
 * @param content - Content to check
 * @returns true if content contains URLs
 */
export function containsUrls(content: string): boolean {
  if (!content) return false;
  URL_PATTERN.lastIndex = 0;
  return URL_PATTERN.test(content);
}
