# Implementation Plan

## 1. Set up AI Chat feature structure and domain layer

- [x] 1.1 Create feature folder structure following DDD pattern
  - Create `fe/src/app/features/ai-chat/` directory with domain/, application/, infrastructure/, presentation/ subfolders
  - Create types.ts with all TypeScript interfaces
  - _Requirements: 8.1, 8.3_

- [x] 1.2 Implement ChatMessage and ChatSession entities
  - Create `chat-message.entity.ts` with id, content, sender, timestamp, status, metadata fields
  - Create `chat-session.entity.ts` with id, userId, messages, context, createdAt, updatedAt fields
  - _Requirements: 8.1, 8.3_

- [x] 1.3 Implement value objects
  - Create `chat-context.vo.ts` with courseId, lessonId, pageUrl, additionalData
  - Create `message-source.vo.ts` with title, content, url
  - Create `user-role.vo.ts` with type definition
  - _Requirements: 6.2, 6.3_

- [ ]* 1.4 Write property test for message serialization round-trip
  - **Property 4: Message Serialization Round-Trip**
  - **Validates: Requirements 8.1, 8.2, 8.3**

- [ ]* 1.5 Write property test for message deserialization validation
  - **Property 5: Message Deserialization Validation**
  - **Validates: Requirements 8.4**

## 2. Implement infrastructure layer (API client and storage)

- [x] 2.1 Create ChatApiClient service
  - Implement `chat-api.client.ts` with sendChatMessage() and checkHealth() methods
  - Configure base URL, headers (X-API-Key), timeout (60s)
  - Handle cold start detection
  - _Requirements: 2.3, 7.1, 7.3, 7.4, 7.5_

- [x] 2.2 Create ChatStorageRepository
  - Implement `chat-storage.repository.ts` for localStorage persistence
  - Methods: saveSession(), loadSession(), clearSession()
  - Handle localStorage unavailability gracefully
  - _Requirements: 6.4, 8.1, 8.2_

- [ ]* 2.3 Write property test for session restoration
  - **Property 11: Session Restoration**
  - **Validates: Requirements 2.2, 3.2, 6.4**

## 3. Implement application layer services

- [x] 3.1 Create SessionManagementService
  - Implement `session-management.service.ts` with signals for currentSessionId, currentContext
  - Methods: generateSessionId(), updateContext(), clearSession()
  - Use UUID for session ID generation
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [ ]* 3.2 Write property test for session ID uniqueness
  - **Property 3: Session ID Uniqueness**
  - **Validates: Requirements 6.1**

- [x] 3.3 Create ChatService
  - Implement `chat.service.ts` with signals for messages, isLoading, error, suggestedQuestions
  - Methods: sendMessage(), loadHistory(), clearHistory(), startNewSession(), retryLastMessage()
  - Integrate with ChatApiClient and ChatStorageRepository
  - _Requirements: 2.2, 2.3, 2.8, 3.2, 3.6, 4.4, 4.5, 4.6_

- [ ]* 3.4 Write property test for role mapping consistency
  - **Property 1: Role Mapping Consistency**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [ ]* 3.5 Write property test for user ID inclusion
  - **Property 2: User ID Inclusion**
  - **Validates: Requirements 5.5**

## 4. Checkpoint - Ensure core services work

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## 5. Implement utility functions

- [x] 5.1 Create MarkdownRenderer utility
  - Implement `markdown-renderer.util.ts` using marked or similar library
  - Support headings, bold, italic, lists, code blocks
  - Sanitize HTML output for security
  - _Requirements: 2.4, 4.3_

- [ ]* 5.2 Write property test for markdown rendering correctness
  - **Property 7: Markdown Rendering Correctness**
  - **Validates: Requirements 2.4, 4.3**

- [x] 5.3 Create ContextExtractor utility
  - Implement `context-extractor.util.ts` to extract courseId, lessonId from current route
  - Use Angular Router to get route parameters
  - _Requirements: 6.2, 6.3_

- [ ]* 5.4 Write property test for context extraction from route
  - **Property 10: Context Extraction from Route**
  - **Validates: Requirements 6.2, 6.3**

- [x] 5.5 Create MessageSerializer utility
  - Implement `message-serializer.util.ts` for JSON serialization/deserialization
  - Include validation for required fields
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

## 6. Implement presentation components - Core

- [x] 6.1 Create TypingIndicatorComponent
  - Implement animated typing indicator (3 dots animation)
  - Use CSS animations for smooth effect
  - _Requirements: 3.3, 4.5_

- [x] 6.2 Create ChatMessageComponent
  - Display message with proper alignment based on sender
  - Render Markdown content using MarkdownRenderer
  - Show error state with retry button for failed messages
  - _Requirements: 4.1, 4.2, 4.3, 4.6_

- [ ]* 6.3 Write property test for message alignment by sender
  - **Property 6: Message Alignment by Sender**
  - **Validates: Requirements 4.1, 4.2**

- [ ]* 6.4 Write property test for error state display
  - **Property 9: Error State Display**
  - **Validates: Requirements 2.8, 4.6**

- [x] 6.5 Create SuggestedQuestionsComponent
  - Display clickable suggestion chips
  - Emit selected question to parent component
  - _Requirements: 2.5, 2.6_

- [ ]* 6.6 Write property test for suggested questions rendering
  - **Property 8: Suggested Questions Rendering**
  - **Validates: Requirements 2.5**

- [x] 6.7 Create SourceCitationComponent
  - Display expandable source citations
  - Toggle expand/collapse on click
  - _Requirements: 3.4, 3.5_

- [ ]* 6.8 Write property test for source citations rendering
  - **Property 12: Source Citations Rendering**
  - **Validates: Requirements 3.4**

- [x] 6.9 Create ChatMessageInputComponent
  - Text input with send button
  - Handle Enter key to send
  - Show loading state while sending
  - _Requirements: 2.3, 4.4_

## 7. Checkpoint - Ensure components work

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## 8. Implement Floating Chat Bubble and Chat Panel

- [x] 8.1 Create FloatingChatBubbleComponent
  - Fixed position at bottom-right corner
  - Responsive size (48px mobile, 56px desktop)
  - Tooltip on hover "Trợ lý AI Hàng Hải"
  - Toggle between AI icon and close icon based on panel state
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 8.2 Create ChatPanelComponent
  - Popup panel with 380px width, 520px height on desktop
  - Full screen on mobile
  - Display messages, input, suggestions
  - "Mở rộng" button to navigate to chat page
  - Smooth open/close animation
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 8.3 Integrate FloatingChatBubble into app layouts
  - Add to StudentLayoutSimpleComponent
  - Add to TeacherLayoutSimpleComponent
  - Add to HomepageLayoutComponent (for guests)
  - Conditionally show based on feature flag
  - _Requirements: 1.1, 5.1, 5.2, 5.3, 5.4_

## 9. Implement Chat Page (Full Page)

- [x] 9.1 Create ChatPageComponent
  - Full-page chat interface
  - Display complete chat history
  - "Cuộc trò chuyện mới" button to start new session
  - Show sources with expandable citations
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 9.2 Configure routing for chat page
  - Add route `/student/ai-chat` for students
  - Add route `/teacher/ai-chat` for teachers
  - Add route `/ai-chat` for guests
  - Update sidebar configs to include AI Chat menu item
  - _Requirements: 3.1_

## 10. Implement error handling and performance features

- [x] 10.1 Implement health check on initialization
  - Call health endpoint when ChatService initializes
  - Display "Service unavailable" if health check fails
  - _Requirements: 7.1, 7.2_

- [x] 10.2 Implement timeout and cold start handling
  - Show "Đang xử lý, vui lòng đợi..." after 5 seconds
  - Show timeout error after 60 seconds with retry option
  - Detect cold start and show warm-up message
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 10.3 Implement retry mechanism
  - Add retry button for failed messages
  - Implement retryLastMessage() in ChatService
  - _Requirements: 2.8, 4.6_

## 11. Final Checkpoint

- [x] 11. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
