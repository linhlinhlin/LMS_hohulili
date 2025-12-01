/**
 * Domain Entities barrel export
 */
export {
  createChatMessage,
  createUserMessage,
  createAiMessage,
  updateMessageStatus,
  isUserMessage,
  isAiMessage,
  isErrorMessage,
  hasSources,
  getMessageAlignment,
} from './chat-message.entity';

export {
  createChatSession,
  addMessageToSession,
  updateMessageInSession,
  removeMessageFromSession,
  updateSessionContext,
  clearSessionMessages,
  getLastMessage,
  getLastUserMessage,
  getMessageCount,
  isSessionEmpty,
  hasSessionContext,
} from './chat-session.entity';

// Re-export types
export type {
  ChatMessage,
  MessageMetadata,
  MessageSender,
  MessageStatus,
} from './chat-message.entity';

export type { ChatSession } from './chat-session.entity';
