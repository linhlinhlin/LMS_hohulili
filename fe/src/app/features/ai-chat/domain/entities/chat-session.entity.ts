/**
 * ChatSession Entity
 * Represents a chat conversation session with history
 */
import { ChatSession, ChatMessage, ChatContext } from '../types';

/**
 * Factory function to create a new ChatSession
 */
export function createChatSession(
  userId: string,
  context?: ChatContext
): ChatSession {
  return {
    id: generateSessionId(),
    userId,
    messages: [],
    context: context ?? {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Add a message to the session
 */
export function addMessageToSession(
  session: ChatSession,
  message: ChatMessage
): ChatSession {
  return {
    ...session,
    messages: [...session.messages, message],
    updatedAt: new Date(),
  };
}

/**
 * Update a message in the session by ID
 */
export function updateMessageInSession(
  session: ChatSession,
  messageId: string,
  updates: Partial<ChatMessage>
): ChatSession {
  return {
    ...session,
    messages: session.messages.map((msg) =>
      msg.id === messageId ? { ...msg, ...updates } : msg
    ),
    updatedAt: new Date(),
  };
}

/**
 * Remove a message from the session by ID
 */
export function removeMessageFromSession(
  session: ChatSession,
  messageId: string
): ChatSession {
  return {
    ...session,
    messages: session.messages.filter((msg) => msg.id !== messageId),
    updatedAt: new Date(),
  };
}

/**
 * Update session context
 */
export function updateSessionContext(
  session: ChatSession,
  context: Partial<ChatContext>
): ChatSession {
  return {
    ...session,
    context: { ...session.context, ...context },
    updatedAt: new Date(),
  };
}

/**
 * Clear all messages from session
 */
export function clearSessionMessages(session: ChatSession): ChatSession {
  return {
    ...session,
    messages: [],
    updatedAt: new Date(),
  };
}

/**
 * Get the last message in the session
 */
export function getLastMessage(session: ChatSession): ChatMessage | undefined {
  return session.messages[session.messages.length - 1];
}

/**
 * Get the last user message in the session
 */
export function getLastUserMessage(
  session: ChatSession
): ChatMessage | undefined {
  return [...session.messages].reverse().find((msg) => msg.sender === 'user');
}

/**
 * Get message count in session
 */
export function getMessageCount(session: ChatSession): number {
  return session.messages.length;
}

/**
 * Check if session is empty (no messages)
 */
export function isSessionEmpty(session: ChatSession): boolean {
  return session.messages.length === 0;
}

/**
 * Check if session has context
 */
export function hasSessionContext(session: ChatSession): boolean {
  return !!(session.context.courseId || session.context.lessonId);
}

/**
 * Generate unique session ID using UUID-like format
 */
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `session_${timestamp}_${randomPart}`;
}

// Re-export types for convenience
export type { ChatSession };

