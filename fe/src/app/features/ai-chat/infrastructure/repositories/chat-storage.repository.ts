/**
 * ChatStorageRepository - localStorage persistence for chat sessions
 * Handles saving and loading chat history with USER ISOLATION
 * Each user has their own storage namespace to prevent data leakage
 */
import { Injectable } from '@angular/core';
import { ChatSession, ChatMessage } from '../../domain/types';

/**
 * Storage key prefixes - actual keys will include userId
 * Format: ai_chat_{type}_{userId}
 */
const STORAGE_KEY_PREFIX = {
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
  private currentUserId: string = '';

  constructor() {
    this.isStorageAvailable = this.checkStorageAvailability();
  }

  /**
   * Set current user ID for storage isolation
   * MUST be called when user logs in
   */
  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string {
    return this.currentUserId;
  }

  /**
   * Get user-specific storage key
   * Format: {prefix}_{userId}
   */
  private getStorageKey(keyType: keyof typeof STORAGE_KEY_PREFIX): string {
    const userId = this.currentUserId || 'anonymous';
    return `${STORAGE_KEY_PREFIX[keyType]}_${userId}`;
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
   * Save a chat session to localStorage (user-isolated)
   */
  saveSession(session: ChatSession): boolean {
    if (!this.isStorageAvailable) return false;

    try {
      const serialized = this.serializeSession(session);
      localStorage.setItem(this.getStorageKey('SESSION'), JSON.stringify(serialized));
      localStorage.setItem(this.getStorageKey('LAST_SESSION_ID'), session.id);
      return true;
    } catch (error) {
      console.error('Failed to save chat session:', error);
      return false;
    }
  }

  /**
   * Load a chat session from localStorage (user-isolated)
   */
  loadSession(): ChatSession | null {
    if (!this.isStorageAvailable) return null;

    try {
      const data = localStorage.getItem(this.getStorageKey('SESSION'));
      if (!data) return null;

      const serialized: SerializedSession = JSON.parse(data);
      // Verify session belongs to current user
      if (serialized.userId !== this.currentUserId && this.currentUserId !== '') {
        console.warn('Session userId mismatch, clearing invalid session');
        this.clearSession();
        return null;
      }
      return this.deserializeSession(serialized);
    } catch (error) {
      console.error('Failed to load chat session:', error);
      return null;
    }
  }

  /**
   * Clear the stored session for current user
   */
  clearSession(): boolean {
    if (!this.isStorageAvailable) return false;

    try {
      localStorage.removeItem(this.getStorageKey('SESSION'));
      localStorage.removeItem(this.getStorageKey('MESSAGES'));
      localStorage.removeItem(this.getStorageKey('LAST_SESSION_ID'));
      return true;
    } catch (error) {
      console.error('Failed to clear chat session:', error);
      return false;
    }
  }

  /**
   * Clear ALL ai chat sessions (for logout - security)
   * This clears sessions for ALL users on this device
   */
  clearAllSessions(): boolean {
    if (!this.isStorageAvailable) return false;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith(STORAGE_KEY_PREFIX.SESSION) ||
          key.startsWith(STORAGE_KEY_PREFIX.MESSAGES) ||
          key.startsWith(STORAGE_KEY_PREFIX.LAST_SESSION_ID)
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${keysToRemove.length} AI chat storage keys`);
      return true;
    } catch (error) {
      console.error('Failed to clear all chat sessions:', error);
      return false;
    }
  }

  /**
   * Get the last session ID for current user
   */
  getLastSessionId(): string | null {
    if (!this.isStorageAvailable) return null;
    return localStorage.getItem(this.getStorageKey('LAST_SESSION_ID'));
  }

  /**
   * Check if a session exists in storage for current user
   */
  hasStoredSession(): boolean {
    if (!this.isStorageAvailable) return false;
    return localStorage.getItem(this.getStorageKey('SESSION')) !== null;
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
   * Get storage usage info for current user
   */
  getStorageInfo(): { used: number; available: boolean; userId: string } {
    if (!this.isStorageAvailable) {
      return { used: 0, available: false, userId: this.currentUserId };
    }

    const sessionData = localStorage.getItem(this.getStorageKey('SESSION')) || '';
    return {
      used: new Blob([sessionData]).size,
      available: true,
      userId: this.currentUserId,
    };
  }

  /**
   * Clear sessions with invalid sessionId format (not UUID)
   * Call this on app init to clean up old format sessions
   */
  clearInvalidSessions(): boolean {
    if (!this.isStorageAvailable) return false;

    try {
      const lastSessionId = this.getLastSessionId();
      // Check if sessionId is NOT a valid UUID (UUIDs have dashes and are 36 chars)
      if (lastSessionId && (!lastSessionId.includes('-') || lastSessionId.length !== 36)) {
        console.log('Clearing invalid session format:', lastSessionId);
        this.clearSession();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to clear invalid sessions:', error);
      return false;
    }
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
