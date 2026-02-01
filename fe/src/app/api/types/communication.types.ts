/**
 * Communication Types
 * Types for forums, discussions, notifications, messaging
 * PostgreSQL Tables: notifications, discussion_threads, discussion_replies
 */

// =======================
// Forum Types
// =======================

export interface ForumPost {
    id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    categoryId: string;
    categoryName: string;
    courseId?: string;
    tags?: string[];
    pinned: boolean;
    locked: boolean;
    viewCount: number;
    replyCount: number;
    likeCount: number;
    createdAt: string; // ISO 8601
    updatedAt?: string; // ISO 8601
}

export interface ForumReply {
    id: string;
    postId: string;
    parentId?: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    likeCount: number;
    isAccepted: boolean;
    createdAt: string; // ISO 8601
    updatedAt?: string; // ISO 8601
    replies?: ForumReply[];
}

export interface ForumCategory {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    postCount: number;
    order: number;
}

// =======================
// Discussion Types
// =======================

export type DiscussionCategory = 'question' | 'discussion' | 'announcement' | 'resource';
export type AuthorRole = 'student' | 'teacher' | 'admin';

export interface DiscussionBoard {
    id: string;
    name: string;
    description: string;
    courseId: string;
    courseName: string;
    icon: string;
    color: string;
    threadCount: number;
    replyCount: number;
    lastActivityAt?: Date;
    isActive: boolean;
    isLocked?: boolean;
}

export interface DiscussionThread {
    id: string;
    boardId?: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    courseId: string;
    courseName: string;
    lessonId?: string;
    lessonName?: string;
    category: DiscussionCategory;
    tags: string[];
    isPinned: boolean;
    isLocked: boolean;
    isResolved: boolean;
    views: number;
    replyCount?: number;
    viewCount?: number;
    replies: DiscussionReply[];
    createdAt: Date;
    updatedAt: Date;
    lastActivityAt: Date;
    lastReplyAt?: string; // ISO 8601 for API compatibility
}

export interface DiscussionReply {
    id: string;
    threadId: string;
    parentId?: string;
    content: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    authorRole: AuthorRole;
    isInstructor?: boolean;
    isAccepted: boolean;
    likes: number;
    createdAt: Date;
    updatedAt: Date;
    children?: DiscussionReply[];
}

// =======================
// Post Creation Types
// =======================

export interface PostCreation {
    title: string;
    content: string;
    categoryId: string;
    courseId?: string;
    tags?: string[];
    attachments?: PostAttachment[];
}

export interface PostAttachment {
    id?: string;
    name: string;
    type: string;
    url?: string;
    size: number;
    file?: File;
}

// =======================
// Notification Types
// =======================

export interface Notification {
    id: string;
    type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
    category: 'system' | 'course' | 'assignment' | 'grade' | 'message' | 'enrollment';
    title: string;
    message: string;
    link?: string;
    linkText?: string;
    isRead: boolean;
    isPinned: boolean;
    createdAt: string; // ISO 8601
    expiresAt?: string; // ISO 8601
    metadata?: Record<string, any>;
}

export interface NotificationSettings {
    emailEnabled: boolean;
    pushEnabled: boolean;
    categories: {
        [key: string]: {
            email: boolean;
            push: boolean;
            inApp: boolean;
        };
    };
    quietHours?: {
        enabled: boolean;
        start: string; // HH:mm
        end: string;   // HH:mm
    };
}

export interface NotificationTemplate {
    id: string;
    name: string;
    type: string;
    subject: string;
    body: string;
    variables: string[];
}

// =======================
// Chat Dialog Types
// =======================

export interface DialogConfig {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'info' | 'warning' | 'danger' | 'success';
    showCancel?: boolean;
}

export interface DialogState {
    isOpen: boolean;
    config: DialogConfig | null;
    resolveCallback?: (result: boolean) => void;
}

// =======================
// Toast Types
// =======================

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
    dismissible?: boolean;
    action?: {
        label: string;
        callback: () => void;
    };
}

