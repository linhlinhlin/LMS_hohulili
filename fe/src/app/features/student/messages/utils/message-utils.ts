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
  createdAt: string;
  readAt?: string;
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
    avatar?: string;
  };
  lastMessagePreview: string;
  lastMessageTime: string;
  unreadCount: number;
  isArchived: boolean;
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

  return {
    conversationId: conversation.id,
    otherParticipant: otherParticipant
      ? {
          id: otherParticipant.id,
          name: otherParticipant.name,
          avatar: otherParticipant.avatar,
        }
      : { id: '', name: 'Unknown', avatar: undefined },
    lastMessagePreview: formatMessagePreview(
      conversation.lastMessage?.content || ''
    ),
    lastMessageTime: conversation.lastMessage?.createdAt || conversation.updatedAt,
    unreadCount: conversation.unreadCount,
    isArchived: conversation.isArchived,
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
