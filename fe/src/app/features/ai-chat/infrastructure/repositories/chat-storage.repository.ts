/**
 * ChatStorageRepository - localStorage persistence for chat sessions
 * Handles saving and loading chat history
 */
import { Injectable } from '@angular/core';
import { ChatSession, ChatMessage } from '../../domain/types';

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  SESSION: 'ai_chat_session',
  MESSAGES: 'ai_chat_messages',
  LAST_SESSION_ID: 'ai_chat_last_session_id',
} as const;

/**
 * Serialized session format for storage
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
 * Serialized message format for storage
 */
interface SerializedMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  status: 'sending' | 'sent' | 'error';
  metadata?: Record<string, unknown>;
}

@Injectable({
  providedIn: 'root',
})
export class ChatStorageRepository {
  private isStorageAvailable: boolean;

  constructor() {
    this.isStorageAvailable = this.checkStorageAvailability();
  }

  /**
   * Check if localStorage is available
   */
  private checkStorageAvailability(): boolean {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch {
      console.warn('localStorage is not available. Chat history will not be persisted.');
      return false;
    }
  }

  /**
   * Save a chat session to localStorage
   */
  saveSession(session: ChatSession): boolean {
    if (!this.isStorageAvailable) return false;

    try {
      const serialized = this.serializeSession(session);
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(serialized));
      localStorage.setItem(STORAGE_KEYS.LAST_SESSION_ID, session.id);
      return true;
    } catch (error) {
      console.error('Failed to save chat session:', error);
      return false;
    }
  }

  /**
   * Load a chat session from localStorage
   */
  loadSession(): ChatSession | null {
    if (!this.isStorageAvailable) return null;

    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSION);
      if (!data) return null;

      const serialized: SerializedSession = JSON.parse(data);
      return this.deserializeSession(serialized);
    } catch (error) {
      console.error('Failed to load chat session:', error);
      return null;
    }
  }

  /**
   * Clear the stored session
   */
  clearSession(): boolean {
    if (!this.isStorageAvailable) return false;

    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
      localStorage.removeItem(STORAGE_KEYS.LAST_SESSION_ID);
      return true;
    } catch (error) {
      console.error('Failed to clear chat session:', error);
      return false;
    }
  }

  /**
   * Get the last session ID
   */
  getLastSessionId(): string | null {
    if (!this.isStorageAvailable) return null;
    return localStorage.getItem(STORAGE_KEYS.LAST_SESSION_ID);
  }

  /**
   * Check if a session exists in storage
   */
  hasStoredSession(): boolean {
    if (!this.isStorageAvailable) return false;
    return localStorage.getItem(STORAGE_KEYS.SESSION) !== null;
  }

  /**
   * Add a single message to the stored session
   */
  addMessage(message: ChatMessage): boolean {
    const session = this.loadSession();
    if (!session) return false;

    session.messages.push(message);
    session.updatedAt = new Date();
    return this.saveSession(session);
  }

  /**
   * Update a message in the stored session
   */
  updateMessage(messageId: string, updates: Partial<ChatMessage>): boolean {
    const session = this.loadSession();
    if (!session) return false;

    const messageIndex = session.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return false;

    session.messages[messageIndex] = {
      ...session.messages[messageIndex],
      ...updates,
    };
    session.updatedAt = new Date();
    return this.saveSession(session);
  }

  /**
   * Get storage usage info
   */
  getStorageInfo(): { used: number; available: boolean } {
    if (!this.isStorageAvailable) {
      return { used: 0, available: false };
    }

    const sessionData = localStorage.getItem(STORAGE_KEYS.SESSION) || '';
    return {
      used: new Blob([sessionData]).size,
      available: true,
    };
  }

  /**
   * Serialize session for storage
   */
  private serializeSession(session: ChatSession): SerializedSession {
    return {
      id: session.id,
      userId: session.userId,
      messages: session.messages.map((m) => this.serializeMessage(m)),
      context: session.context as Record<string, unknown>,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  /**
   * Deserialize session from storage
   */
  private deserializeSession(data: SerializedSession): ChatSession {
    return {
      id: data.id,
      userId: data.userId,
      messages: data.messages.map((m) => this.deserializeMessage(m)),
      context: data.context,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  }

  /**
   * Serialize message for storage
   */
  private serializeMessage(message: ChatMessage): SerializedMessage {
    return {
      id: message.id,
      content: message.content,
      sender: message.sender,
      timestamp: message.timestamp.toISOString(),
      status: message.status,
      metadata: message.metadata as Record<string, unknown> | undefined,
    };
  }

  /**
   * Deserialize message from storage
   */
  private deserializeMessage(data: SerializedMessage): ChatMessage {
    return {
      id: data.id,
      content: data.content,
      sender: data.sender,
      timestamp: new Date(data.timestamp),
      status: data.status,
      metadata: data.metadata as ChatMessage['metadata'],
    };
  }
}
