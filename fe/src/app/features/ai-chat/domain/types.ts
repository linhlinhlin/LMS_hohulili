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
export type UserRole = 'student' | 'teacher' | 'admin' | 'org_admin' | 'guest';

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
 * Source citation from AI response with PDF highlighting support
 * Updated: 10/12/2025 - Added bounding boxes for source highlighting
 */
export interface MessageSource {
  title: string;
  content: string;
  url?: string;
  imageUrl?: string;      // URL ảnh trang PDF
  pageNumber?: number;    // Số trang
  documentId?: string;    // ID tài liệu
  boundingBoxes?: BoundingBox[];  // Tọa độ highlight
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
  thinking?: string; // AI reasoning process (stored separately from content)
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
 * Bounding box for PDF highlighting
 * Coordinates are percentages (0-100) relative to page dimensions
 */
export interface BoundingBox {
  x0: number;  // Left
  y0: number;  // Top
  x1: number;  // Right
  y1: number;  // Bottom
}

/**
 * Source citation with PDF highlighting support
 * Updated: 10/12/2025 - Added bounding boxes for source highlighting
 */
export interface Source {
  title: string;
  content: string;
  url?: string;
  imageUrl?: string;      // URL ảnh trang PDF
  pageNumber?: number;    // Số trang
  documentId?: string;    // ID tài liệu
  boundingBoxes?: BoundingBox[];  // Tọa độ highlight
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
 * Response from GET /api/v3/ai/history/{user_id}
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
// Streaming API Types (SSE)
// ============================================================================

/**
 * Stream event types from SSE endpoint
 */
export type StreamEventType = 'thinking_start' | 'thinking' | 'thinking_end' | 'answer' | 'sources' | 'suggested_questions' | 'metadata' | 'done' | 'error' | 'raw';

/**
 * Base stream event
 */
export interface StreamEvent {
  type?: StreamEventType;
  content?: string;
  sources?: Source[];
  questions?: string[];
  processing_time?: number;
  confidence_score?: number;
  query_type?: string;
  message?: string; // For error events
}

/**
 * Thinking event - AI reasoning process
 */
export interface ThinkingEvent extends StreamEvent {
  type: 'thinking';
  content: string;
}

/**
 * Answer event - Response chunk
 */
export interface AnswerEvent extends StreamEvent {
  type: 'answer';
  content: string;
}

/**
 * Sources event - Citations
 */
export interface SourcesEvent extends StreamEvent {
  type: 'sources';
  sources: Source[];
}

/**
 * Suggested questions event
 */
export interface SuggestedQuestionsEvent extends StreamEvent {
  type: 'suggested_questions';
  questions: string[];
}

/**
 * Metadata event - Processing info
 */
export interface MetadataEvent extends StreamEvent {
  type: 'metadata';
  processing_time: number;
  confidence_score?: number;
  query_type?: string;
}

/**
 * Done event - Stream completed
 */
export interface DoneEvent extends StreamEvent {
  type: 'done';
}

/**
 * Error event
 */
export interface ErrorEvent extends StreamEvent {
  type: 'error';
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
