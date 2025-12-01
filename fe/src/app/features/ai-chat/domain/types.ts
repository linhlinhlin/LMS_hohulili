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
// API Types
// ============================================================================

/**
 * Request payload for chat API
 */
export interface ChatRequest {
  user_id: string;
  message: string;
  role: UserRole;
  session_id?: string;
  context?: ChatContext;
}

/**
 * Response data from chat API
 */
export interface ChatResponseData {
  answer: string;
  sources?: MessageSource[];
  suggested_questions?: string[];
}

/**
 * Response metadata from chat API
 */
export interface ChatResponseMetadata {
  processing_time: number;
  model: string;
  agent_type: string;
}

/**
 * Full response from chat API
 */
export interface ChatResponse {
  status: 'success' | 'error';
  data: ChatResponseData;
  metadata: ChatResponseMetadata;
}

/**
 * Health check response
 */
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  message?: string;
  timestamp?: string;
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
