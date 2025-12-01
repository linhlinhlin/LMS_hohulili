/**
 * ChatMessage Entity
 * Represents a single message in a chat conversation
 */
import {
  ChatMessage,
  MessageMetadata,
  MessageSender,
  MessageStatus,
  MessageSource,
} from '../types';

/**
 * Factory function to create a new ChatMessage
 */
export function createChatMessage(
  content: string,
  sender: MessageSender,
  options?: Partial<Omit<ChatMessage, 'id' | 'content' | 'sender' | 'timestamp'>>
): ChatMessage {
  return {
    id: generateMessageId(),
    content,
    sender,
    timestamp: new Date(),
    status: options?.status ?? 'sending',
    metadata: options?.metadata,
  };
}

/**
 * Factory function to create a user message
 */
export function createUserMessage(content: string): ChatMessage {
  return createChatMessage(content, 'user', { status: 'sending' });
}

/**
 * Factory function to create an AI message from API response
 */
export function createAiMessage(
  content: string,
  sources?: MessageSource[],
  processingTime?: number
): ChatMessage {
  const metadata: MessageMetadata = {};
  if (sources?.length) metadata.sources = sources;
  if (processingTime !== undefined) metadata.processingTime = processingTime;

  return createChatMessage(content, 'ai', {
    status: 'sent',
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  });
}

/**
 * Update message status
 */
export function updateMessageStatus(
  message: ChatMessage,
  status: MessageStatus
): ChatMessage {
  return { ...message, status };
}

/**
 * Check if message is from user
 */
export function isUserMessage(message: ChatMessage): boolean {
  return message.sender === 'user';
}

/**
 * Check if message is from AI
 */
export function isAiMessage(message: ChatMessage): boolean {
  return message.sender === 'ai';
}

/**
 * Check if message has error status
 */
export function isErrorMessage(message: ChatMessage): boolean {
  return message.status === 'error';
}

/**
 * Check if message has sources
 */
export function hasSources(message: ChatMessage): boolean {
  return (message.metadata?.sources?.length ?? 0) > 0;
}

/**
 * Get message alignment based on sender
 */
export function getMessageAlignment(message: ChatMessage): 'left' | 'right' {
  return message.sender === 'user' ? 'right' : 'left';
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Re-export types for convenience
export type { ChatMessage, MessageMetadata, MessageSender, MessageStatus };
