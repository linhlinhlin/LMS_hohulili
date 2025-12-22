/**
 * MessageSerializer Utility
 * Handles JSON serialization/deserialization of chat messages
 * Includes validation for required fields
 */
import { ChatMessage, ChatSession, MessageMetadata } from '../domain/types';

/**
 * Serialized message format
 */
interface SerializedMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  status: 'sending' | 'sent' | 'error';
  metadata?: MessageMetadata;
}

/**
 * Serialized session format
 */
interface SerializedSession {
  id: string;
  userId: string;
  messages: SerializedMessage[];
  context: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Validation result
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Serialize a ChatMessage to JSON string
 */
export function serializeMessage(message: ChatMessage): string {
  const serialized: SerializedMessage = {
    id: message.id,
    content: message.content,
    sender: message.sender,
    timestamp: message.timestamp.toISOString(),
    status: message.status,
    metadata: message.metadata,
  };
  return JSON.stringify(serialized);
}

/**
 * Deserialize JSON string to ChatMessage
 * Throws error if validation fails
 */
export function deserializeMessage(json: string): ChatMessage {
  const data = JSON.parse(json) as SerializedMessage;
  const validation = validateMessageData(data);

  if (!validation.valid) {
    throw new Error(`Invalid message data: ${validation.errors.join(', ')}`);
  }

  return {
    id: data.id,
    content: data.content,
    sender: data.sender,
    timestamp: new Date(data.timestamp),
    status: data.status,
    metadata: data.metadata,
  };
}

/**
 * Safely deserialize message, returns null on failure
 */
export function safeDeserializeMessage(json: string): ChatMessage | null {
  try {
    return deserializeMessage(json);
  } catch {
    return null;
  }
}

/**
 * Serialize a ChatSession to JSON string
 */
export function serializeSession(session: ChatSession): string {
  const serialized: SerializedSession = {
    id: session.id,
    userId: session.userId,
    messages: session.messages.map((m) => ({
      id: m.id,
      content: m.content,
      sender: m.sender,
      timestamp: m.timestamp.toISOString(),
      status: m.status,
      metadata: m.metadata,
    })),
    context: session.context as Record<string, unknown>,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
  return JSON.stringify(serialized);
}

/**
 * Deserialize JSON string to ChatSession
 * Throws error if validation fails
 */
export function deserializeSession(json: string): ChatSession {
  const data = JSON.parse(json) as SerializedSession;
  const validation = validateSessionData(data);

  if (!validation.valid) {
    throw new Error(`Invalid session data: ${validation.errors.join(', ')}`);
  }

  return {
    id: data.id,
    userId: data.userId,
    messages: data.messages.map((m) => ({
      id: m.id,
      content: m.content,
      sender: m.sender,
      timestamp: new Date(m.timestamp),
      status: m.status,
      metadata: m.metadata,
    })),
    context: data.context,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

/**
 * Safely deserialize session, returns null on failure
 */
export function safeDeserializeSession(json: string): ChatSession | null {
  try {
    return deserializeSession(json);
  } catch {
    return null;
  }
}

/**
 * Validate message data has required fields
 */
export function validateMessageData(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data must be an object'] };
  }

  const msg = data as Record<string, unknown>;

  // Required fields
  if (!msg['id'] || typeof msg['id'] !== 'string') {
    errors.push('Missing or invalid id field');
  }

  if (!msg['content'] || typeof msg['content'] !== 'string') {
    errors.push('Missing or invalid content field');
  }

  if (!msg['sender'] || !['user', 'ai'].includes(msg['sender'] as string)) {
    errors.push('Missing or invalid sender field (must be "user" or "ai")');
  }

  if (!msg['timestamp'] || typeof msg['timestamp'] !== 'string') {
    errors.push('Missing or invalid timestamp field');
  } else {
    const date = new Date(msg['timestamp'] as string);
    if (isNaN(date.getTime())) {
      errors.push('Invalid timestamp format');
    }
  }

  if (
    !msg['status'] ||
    !['sending', 'sent', 'error'].includes(msg['status'] as string)
  ) {
    errors.push('Missing or invalid status field');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate session data has required fields
 */
export function validateSessionData(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data must be an object'] };
  }

  const session = data as Record<string, unknown>;

  // Required fields
  if (!session['id'] || typeof session['id'] !== 'string') {
    errors.push('Missing or invalid id field');
  }

  if (!session['userId'] || typeof session['userId'] !== 'string') {
    errors.push('Missing or invalid userId field');
  }

  if (!Array.isArray(session['messages'])) {
    errors.push('Missing or invalid messages field (must be array)');
  } else {
    // Validate each message
    (session['messages'] as unknown[]).forEach((msg, index) => {
      const msgValidation = validateMessageData(msg);
      if (!msgValidation.valid) {
        errors.push(`Message ${index}: ${msgValidation.errors.join(', ')}`);
      }
    });
  }

  if (!session['createdAt'] || typeof session['createdAt'] !== 'string') {
    errors.push('Missing or invalid createdAt field');
  }

  if (!session['updatedAt'] || typeof session['updatedAt'] !== 'string') {
    errors.push('Missing or invalid updatedAt field');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format message for display (pretty print)
 */
export function formatMessageForDisplay(message: ChatMessage): string {
  const sender = message.sender === 'user' ? 'Bạn' : 'AI';
  const time = message.timestamp.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `[${time}] ${sender}: ${message.content}`;
}

/**
 * Export messages to plain text format
 */
export function exportMessagesToText(messages: ChatMessage[]): string {
  return messages.map(formatMessageForDisplay).join('\n');
}

