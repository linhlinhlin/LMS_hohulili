/**
 * AI Chat Domain Types
 * Core TypeScript interfaces for the AI Chatbot feature
 */

// ============================================================================
// Value Objects
// ============================================================================

/**
 * User role for AI behavior customization
 */
export type UserRole = 'student' | 'teacher' | 'admin' | 'guest';

/**
 * Message sender type
 */
export type MessageSender = 'user' | 'ai';

/**
 * Message delivery status
 */
export type MessageStatus = 'sending' | 'sent' | 'error';

/**
 * Chat context containing learning environment information
 */
export interface ChatContext {
  courseId?: string;
  lessonId?: string;
  pageUrl?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * Source citation from AI response
 */
export interface MessageSource {
  title: string;
  content: string;
  url?: string;
}

// ============================================================================
// Entities
// ============================================================================

/**
 * Message metadata containing additional response information
 */
export interface MessageMetadata {
  sources?: MessageSource[];
  processingTime?: number;
  model?: string;
  agentType?: string;
}

/**
 * Chat message entity
 */
export interface ChatMessage {
  id: string;
  content: string;
  sender: MessageSender;
  timestamp: Date;
  status: MessageStatus;
  metadata?: MessageMetadata;
}

/**
 * Chat session entity containing conversation history
 */
export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context: ChatContext;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API Types (Backend Proxy)
// ============================================================================

/**
 * Request payload for chat API
 */
export interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: ChatContext;
}

/**
 * Response from chat API
 */
export interface ChatResponse {
  status: 'success';
  data: ChatData;
}

/**
 * Inner data of chat response
 */
export interface ChatData {
  sessionId: string;
  messageId: string;
  answer: string;
  sources: Source[];
  suggestedQuestions: string[];
  metadata: ResponseMetadata;
}

/**
 * Source citation
 */
export interface Source {
  title: string;
  content: string;
  url?: string;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  processingTime: number;
}

/**
 * Sessions list response
 */
export interface SessionsResponse {
  content: SessionSummary[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/**
 * Session summary item
 */
export interface SessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

/**
 * Session detail with messages
 */
export interface SessionDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessageDTO[];
}

/**
 * Chat message DTO from API
 */
export interface ChatMessageDTO {
  id: string;
  content: string;
  senderType: 'USER' | 'AI';
  createdAt: string;
  sources: Source[];
}

/**
 * Health check response
 */
export interface HealthStatus {
  status: string;
  aiServiceStatus: string;
  version: string;
  error?: string;
}

// ============================================================================
// History API Types (Server-Side Sync)
// ============================================================================

/**
 * Single history message from AI backend
 */
export interface HistoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * Pagination info for history response
 */
export interface HistoryPagination {
  total: number;
  limit: number;
  offset: number;
}

/**
 * Response from GET /api/v1/history/{user_id}
 */
export interface HistoryResponse {
  data: HistoryMessage[];
  pagination: HistoryPagination;
}

/**
 * API Error response
 */
export interface ApiError {
  status: number;
  message: string;
}

// ============================================================================
// Component Configuration Types
// ============================================================================

/**
 * Floating chat bubble configuration
 */
export interface FloatingChatBubbleConfig {
  position: 'bottom-right' | 'bottom-left';
  size: 'small' | 'medium' | 'large';
  tooltipText: string;
  iconType: 'ai' | 'chat' | 'custom';
}

/**
 * Chat panel configuration
 */
export interface ChatPanelConfig {
  width: number;
  height: number;
  maxHeight: number;
  showHeader: boolean;
  showExpandButton: boolean;
}

/**
 * Chat page configuration
 */
export interface ChatPageConfig {
  showSidebar: boolean;
  showSources: boolean;
  enableNewConversation: boolean;
}

// ============================================================================
// Service State Types
// ============================================================================

/**
 * Chat service state
 */
export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  suggestedQuestions: string[];
  isTyping: boolean;
}

/**
 * Session management state
 */
export interface SessionState {
  sessionId: string;
  context: ChatContext;
  userId: string;
  role: UserRole;
}
