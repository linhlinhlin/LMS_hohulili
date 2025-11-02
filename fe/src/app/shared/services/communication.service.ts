import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';

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

export interface DiscussionForum {
  id: string;
  title: string;
  description: string;
  courseId?: string;
  courseTitle?: string;
  authorId: string;
  authorName: string;
  category: 'general' | 'course' | 'assignment' | 'technical' | 'announcement';
  isPinned: boolean;
  isLocked: boolean;
  postCount: number;
  lastPost?: {
    authorName: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ForumPost {
  id: string;
  forumId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'student' | 'admin';
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
  lastReply?: {
    authorName: string;
    timestamp: Date;
  };
  attachments?: MessageAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CommunicationService {
  private http = inject(HttpClient);

  // API Configuration
  private readonly API_BASE_URL = 'https://api.lms-maritime.com/v1';
  private readonly ENDPOINTS = {
    messages: '/communication/messages',
    conversations: '/communication/conversations',
    announcements: '/communication/announcements',
    forums: '/communication/forums',
    posts: '/communication/posts'
  };

  // Signals for reactive state management
  private _messages = signal<Message[]>([]);
  private _conversations = signal<Conversation[]>([]);
  private _announcements = signal<Announcement[]>([]);
  private _forums = signal<DiscussionForum[]>([]);
  private _posts = signal<ForumPost[]>([]);
  private _isLoading = signal<boolean>(false);
  private _isOnline = signal<boolean>(true);

  // Readonly signals for external consumption
  readonly messages = this._messages.asReadonly();
  readonly conversations = this._conversations.asReadonly();
  readonly announcements = this._announcements.asReadonly();
  readonly forums = this._forums.asReadonly();
  readonly posts = this._posts.asReadonly();
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
    this.loadMockData();
    this.startRealTimeUpdates();
  }

  // Message Management Methods
  async sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'isRead'>): Promise<Message> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      const newMessage: Message = {
        ...message,
        id: this.generateId(),
        timestamp: new Date(),
        isRead: false
      };

      this._messages.update(messages => [newMessage, ...messages]);
      
      // Update conversation
      this.updateConversationWithMessage(newMessage);
      
      return newMessage;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getMessages(conversationId?: string): Promise<Message[]> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      if (conversationId) {
        return this._messages().filter(m => m.threadId === conversationId);
      }
      
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
      await this.simulateApiCall();
      return this._conversations();
    } finally {
      this._isLoading.set(false);
    }
  }

  async createConversation(participantIds: string[]): Promise<Conversation> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      const newConversation: Conversation = {
        id: this.generateId(),
        participants: participantIds.map(id => ({
          id,
          name: `User ${id}`,
          role: 'student' as const,
          isOnline: Math.random() > 0.5
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

  // Announcement Management Methods
  async createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt' | 'readBy'>): Promise<Announcement> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      const newAnnouncement: Announcement = {
        ...announcement,
        id: this.generateId(),
        readBy: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this._announcements.update(announcements => [newAnnouncement, ...announcements]);
      return newAnnouncement;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getAnnouncements(): Promise<Announcement[]> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      return this._announcements();
    } finally {
      this._isLoading.set(false);
    }
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

  // Forum Management Methods
  async createForum(forum: Omit<DiscussionForum, 'id' | 'createdAt' | 'updatedAt'>): Promise<DiscussionForum> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      const newForum: DiscussionForum = {
        ...forum,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this._forums.update(forums => [newForum, ...forums]);
      return newForum;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getForums(): Promise<DiscussionForum[]> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      return this._forums();
    } finally {
      this._isLoading.set(false);
    }
  }

  async createPost(post: Omit<ForumPost, 'id' | 'createdAt' | 'updatedAt'>): Promise<ForumPost> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      const newPost: ForumPost = {
        ...post,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this._posts.update(posts => [newPost, ...posts]);
      
      // Update forum post count
      this._forums.update(forums =>
        forums.map(forum =>
          forum.id === post.forumId
            ? { ...forum, postCount: forum.postCount + 1, lastPost: { authorName: post.authorName, timestamp: new Date() } }
            : forum
        )
      );
      
      return newPost;
    } finally {
      this._isLoading.set(false);
    }
  }

  async getPosts(forumId?: string): Promise<ForumPost[]> {
    this._isLoading.set(true);
    try {
      await this.simulateApiCall();
      
      if (forumId) {
        return this._posts().filter(post => post.forumId === forumId);
      }
      
      return this._posts();
    } finally {
      this._isLoading.set(false);
    }
  }

  // Real-time Updates
  private startRealTimeUpdates(): void {
    // Simulate real-time message updates
    interval(10000).subscribe(() => {
      this.checkForNewMessages();
    });
  }

  private async checkForNewMessages(): Promise<void> {
    // In a real implementation, this would check for new messages via WebSocket or polling
    // For now, we'll simulate occasional new messages
    if (Math.random() > 0.8) {
      this.simulateNewMessage();
    }
  }

  private simulateNewMessage(): void {
    const mockMessage: Message = {
      id: this.generateId(),
      senderId: 'student_1',
      senderName: 'Nguyễn Văn A',
      senderRole: 'student',
      recipientId: 'teacher_1',
      recipientName: 'Giảng viên',
      recipientRole: 'teacher',
      subject: 'Câu hỏi về bài tập',
      content: 'Em có thắc mắc về bài tập tuần này, thầy có thể giải thích giúp em được không ạ?',
      timestamp: new Date(),
      isRead: false,
      isImportant: false,
      threadId: 'conversation_1'
    };

    this._messages.update(messages => [mockMessage, ...messages]);
    this.updateConversationWithMessage(mockMessage);
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

  private async simulateApiCall(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Mock Data Methods
  private loadMockData(): void {
    this.loadMockMessages();
    this.loadMockConversations();
    this.loadMockAnnouncements();
    this.loadMockForums();
    this.loadMockPosts();
  }

  private loadMockMessages(): void {
    const mockMessages: Message[] = [
      {
        id: 'msg_1',
        senderId: 'student_1',
        senderName: 'Nguyễn Văn A',
        senderRole: 'student',
        recipientId: 'teacher_1',
        recipientName: 'Giảng viên',
        recipientRole: 'teacher',
        subject: 'Câu hỏi về bài tập',
        content: 'Em có thắc mắc về bài tập tuần này, thầy có thể giải thích giúp em được không ạ?',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isRead: false,
        isImportant: false,
        threadId: 'conv_1'
      },
      {
        id: 'msg_2',
        senderId: 'teacher_1',
        senderName: 'Giảng viên',
        senderRole: 'teacher',
        recipientId: 'student_1',
        recipientName: 'Nguyễn Văn A',
        recipientRole: 'student',
        subject: 'Re: Câu hỏi về bài tập',
        content: 'Chào em! Thầy sẽ giải thích chi tiết trong buổi học tiếp theo nhé.',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        isRead: true,
        isImportant: false,
        threadId: 'conv_1',
        replyTo: 'msg_1'
      }
    ];

    this._messages.set(mockMessages);
  }

  private loadMockConversations(): void {
    const mockConversations: Conversation[] = [
      {
        id: 'conv_1',
        participants: [
          { id: 'teacher_1', name: 'Giảng viên', role: 'teacher', isOnline: true },
          { id: 'student_1', name: 'Nguyễn Văn A', role: 'student', isOnline: false }
        ],
        lastMessage: this._messages()[0],
        unreadCount: 1,
        isArchived: false,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      }
    ];

    this._conversations.set(mockConversations);
  }

  private loadMockAnnouncements(): void {
    const mockAnnouncements: Announcement[] = [
      {
        id: 'ann_1',
        title: 'Thông báo về lịch thi cuối kỳ',
        content: 'Lịch thi cuối kỳ sẽ được công bố vào tuần tới. Các em vui lòng theo dõi thông báo.',
        authorId: 'admin_1',
        authorName: 'Ban Quản trị',
        targetAudience: 'students',
        priority: 'high',
        isPublished: true,
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        readBy: [],
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      }
    ];

    this._announcements.set(mockAnnouncements);
  }

  private loadMockForums(): void {
    const mockForums: DiscussionForum[] = [
      {
        id: 'forum_1',
        title: 'Thảo luận về Kỹ thuật Tàu biển',
        description: 'Diễn đàn thảo luận về các vấn đề kỹ thuật trong ngành hàng hải',
        courseId: 'course_1',
        courseTitle: 'Kỹ thuật Tàu biển Cơ bản',
        authorId: 'teacher_1',
        authorName: 'Giảng viên',
        category: 'course',
        isPinned: true,
        isLocked: false,
        postCount: 5,
        lastPost: {
          authorName: 'Nguyễn Văn A',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
      }
    ];

    this._forums.set(mockForums);
  }

  private loadMockPosts(): void {
    const mockPosts: ForumPost[] = [
      {
        id: 'post_1',
        forumId: 'forum_1',
        title: 'Câu hỏi về động cơ tàu',
        content: 'Em muốn hỏi về nguyên lý hoạt động của động cơ diesel trên tàu biển.',
        authorId: 'student_1',
        authorName: 'Nguyễn Văn A',
        authorRole: 'student',
        isPinned: false,
        isLocked: false,
        replyCount: 3,
        lastReply: {
          authorName: 'Giảng viên',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];

    this._posts.set(mockPosts);
  }
}