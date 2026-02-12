import { Injectable, signal, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '../../api/client/api-client';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'student' | 'admin';
  recipientId: string;
  recipientName: string;
  recipientRole: 'teacher' | 'student' | 'admin';
  subject: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  isImportant: boolean;
  attachments?: MessageAttachment[];
  replyTo?: string;
  threadId?: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Conversation {
  id: string;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  unreadCount: number;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  role: 'teacher' | 'student' | 'admin';
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  targetAudience: 'all' | 'teachers' | 'students' | 'specific';
  targetIds?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isPublished: boolean;
  publishedAt?: Date;
  expiresAt?: Date;
  attachments?: MessageAttachment[];
  readBy: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CommunicationService {
  private apiClient = inject(ApiClient);

  // Signals for reactive state management
  private _messages = signal<Message[]>([]);
  private _conversations = signal<Conversation[]>([]);
  private _announcements = signal<Announcement[]>([]);
  private _isLoading = signal<boolean>(false);
  private _isOnline = signal<boolean>(true);

  // Readonly signals for external consumption
  readonly messages = this._messages.asReadonly();
  readonly conversations = this._conversations.asReadonly();
  readonly announcements = this._announcements.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly isOnline = this._isOnline.asReadonly();

  // Computed signals
  readonly unreadMessages = computed(() => 
    this._messages().filter(m => !m.isRead)
  );

  readonly unreadConversations = computed(() => 
    this._conversations().filter(c => c.unreadCount > 0)
  );

  readonly unreadAnnouncements = computed(() => 
    this._announcements().filter(a => !a.readBy.includes('current-user'))
  );

  readonly totalUnreadCount = computed(() => 
    this.unreadMessages().length + 
    this.unreadConversations().reduce((sum, c) => sum + c.unreadCount, 0) +
    this.unreadAnnouncements().length
  );

  readonly recentMessages = computed(() => 
    this._messages()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10)
  );

  readonly activeConversations = computed(() => 
    this._conversations()
      .filter(c => !c.isArchived)
      .sort((a, b) => (b.lastMessage?.timestamp.getTime() || 0) - (a.lastMessage?.timestamp.getTime() || 0))
  );

  constructor() {
    this.startRealTimeUpdates();
  }

  // Message Management Methods
  async sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'isRead'>): Promise<Message> {
    this._isLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.apiClient.post<any>('/api/v3/messages/send', {
          recipientId: message.recipientId,
          subject: message.subject,
          content: message.content
        })
      );

      const data = response.data || response;
      const newMessage: Message = {
        ...message,
        id: data.id || this.generateId(),
        timestamp: new Date(),
        isRead: false
      };

      this._messages.update(messages => [newMessage, ...messages]);
      this.updateConversationWithMessage(newMessage);
      return newMessage;
    } catch {
      // Fallback to client-side creation
      const newMessage: Message = {
        ...message,
        id: this.generateId(),
        timestamp: new Date(),
        isRead: false
      };
      this._messages.update(messages => [newMessage, ...messages]);
      this.updateConversationWithMessage(newMessage);
      return newMessage;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getMessages(conversationId?: string): Promise<Message[]> {
    this._isLoading.set(true);
    try {
      if (conversationId) {
        const response = await firstValueFrom(
          this.apiClient.get<any>(`/api/v3/messages/conversations/${conversationId}/messages`)
        );
        const data = response.data || response || [];
        const msgs = Array.isArray(data) ? data : [];
        const mapped = msgs.map((m: any) => this.mapMessage(m));
        this._messages.set(mapped);
        return mapped;
      }
      return this._messages();
    } catch {
      return this._messages();
    } finally {
      this._isLoading.set(false);
    }
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    this._messages.update(messages =>
      messages.map(message =>
        message.id === messageId
          ? { ...message, isRead: true }
          : message
      )
    );
  }

  async deleteMessage(messageId: string): Promise<void> {
    this._messages.update(messages =>
      messages.filter(message => message.id !== messageId)
    );
  }

  // Conversation Management Methods
  async getConversations(): Promise<Conversation[]> {
    this._isLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.apiClient.get<any>('/api/v3/messages/conversations')
      );
      const data = response.data || response || [];
      const convs = Array.isArray(data) ? data : [];
      const mapped: Conversation[] = convs.map((c: any) => ({
        id: c.id,
        participants: (c.participants || []).map((p: any) => ({
          id: p.id || p.userId,
          name: p.name || p.fullName || '',
          role: (p.role || 'student').toLowerCase() as 'teacher' | 'student' | 'admin',
          isOnline: false
        })),
        lastMessage: c.lastMessage ? this.mapMessage(c.lastMessage) : undefined,
        unreadCount: c.unreadCount || 0,
        isArchived: c.isArchived || false,
        createdAt: new Date(c.createdAt || Date.now()),
        updatedAt: new Date(c.updatedAt || Date.now())
      }));
      this._conversations.set(mapped);
      return mapped;
    } catch {
      return this._conversations();
    } finally {
      this._isLoading.set(false);
    }
  }

  async createConversation(participantIds: string[]): Promise<Conversation> {
    this._isLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.apiClient.post<any>('/api/v3/messages/conversations', { participantIds })
      );
      const data = response.data || response;
      const newConversation: Conversation = {
        id: data.id || this.generateId(),
        participants: participantIds.map(id => ({
          id,
          name: `User ${id}`,
          role: 'student' as const,
          isOnline: false
        })),
        unreadCount: 0,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this._conversations.update(conversations => [newConversation, ...conversations]);
      return newConversation;
    } catch {
      const newConversation: Conversation = {
        id: this.generateId(),
        participants: participantIds.map(id => ({
          id,
          name: `User ${id}`,
          role: 'student' as const,
          isOnline: false
        })),
        unreadCount: 0,
        isArchived: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this._conversations.update(conversations => [newConversation, ...conversations]);
      return newConversation;
    } finally {
      this._isLoading.set(false);
    }
  }

  async archiveConversation(conversationId: string): Promise<void> {
    this._conversations.update(conversations =>
      conversations.map(conversation =>
        conversation.id === conversationId
          ? { ...conversation, isArchived: true }
          : conversation
      )
    );
  }

  // Announcement Management Methods (client-side until backend announcement API)
  createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'readBy'>): Announcement {
    const newAnnouncement: Announcement = {
      ...announcement,
      id: this.generateId(),
      readBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this._announcements.update(announcements => [newAnnouncement, ...announcements]);
    return newAnnouncement;
  }

  getAnnouncements(): Announcement[] {
    return this._announcements();
  }

  async markAnnouncementAsRead(announcementId: string): Promise<void> {
    this._announcements.update(announcements =>
      announcements.map(announcement =>
        announcement.id === announcementId
          ? { ...announcement, readBy: [...announcement.readBy, 'current-user'] }
          : announcement
      )
    );
  }

  async publishAnnouncement(announcementId: string): Promise<void> {
    this._announcements.update(announcements =>
      announcements.map(announcement =>
        announcement.id === announcementId
          ? { ...announcement, isPublished: true, publishedAt: new Date() }
          : announcement
      )
    );
  }

  // Real-time Updates
  private startRealTimeUpdates(): void {
    // Poll for new conversations every 30 seconds
    setInterval(() => this.getConversations(), 30000);
  }

  private updateConversationWithMessage(message: Message): void {
    this._conversations.update(conversations =>
      conversations.map(conversation => {
        if (conversation.id === message.threadId) {
          return {
            ...conversation,
            lastMessage: message,
            unreadCount: conversation.unreadCount + (message.isRead ? 0 : 1),
            updatedAt: new Date()
          };
        }
        return conversation;
      })
    );
  }

  // Utility Methods
  private generateId(): string {
    return 'comm_' + Math.random().toString(36).substr(2, 9);
  }

  private mapMessage(m: any): Message {
    return {
      id: m.id,
      senderId: m.senderId,
      senderName: m.senderName || '',
      senderRole: (m.senderRole || 'student').toLowerCase() as 'teacher' | 'student' | 'admin',
      recipientId: m.recipientId || '',
      recipientName: m.recipientName || '',
      recipientRole: (m.recipientRole || 'student').toLowerCase() as 'teacher' | 'student' | 'admin',
      subject: m.subject || '',
      content: m.content || '',
      timestamp: new Date(m.sentAt || m.timestamp || Date.now()),
      isRead: m.isRead || false,
      isImportant: m.isImportant || false,
      threadId: m.conversationId || m.threadId
    };
  }
}
