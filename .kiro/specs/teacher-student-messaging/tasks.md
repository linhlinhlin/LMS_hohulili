# Implementation Plan

## Phase 1: Core Messaging Infrastructure

- [x] 1. Set up data models and utilities


  - [x] 1.1 Create message utility functions


    - Create `fe/src/app/features/student/messages/utils/message-utils.ts`
    - Implement `sortMessagesByDate()` function for chronological ordering
    - Implement `calculateUnreadCount()` function
    - Implement `formatMessagePreview()` function for conversation list
    - Implement `filterConversationsBySearch()` function
    - _Requirements: 1.4, 2.4, 2.5, 4.1_
  - [ ]* 1.2 Write property tests for message utilities
    - **Property 2: Message Chronological Order**
    - **Property 4: Unread Count Accuracy**
    - **Property 6: Search Results Relevance**
    - **Validates: Requirements 1.4, 2.5, 4.1, 4.2**



  - [x] 1.3 Create MessagingService
    - Create `fe/src/app/core/services/messaging.service.ts`
    - Implement `getConversations()` method
    - Implement `getConversation()` method for specific conversation
    - Implement `getMessages()` method
    - Implement `sendMessage()` method
    - Implement `markAsRead()` method
    - Implement `archiveConversation()` method
    - Implement `searchMessages()` method
    - Implement `getUnreadCount()` method
    - Implement `pollMessages()` or `connectWebSocket()` for real-time updates
    - Add signal-based state management using `toSignal` for WebSocket streams
    - _Requirements: 1.2, 1.3, 1.5, 2.2, 2.3, 3.4, 4.1, 6.2_
  - [ ]* 1.4 Write property tests for MessagingService
    - **Property 1: Message Delivery Guarantee**
    - **Property 5: Read Status Update**
    - **Property 9: Archive Round-Trip**
    - **Validates: Requirements 1.2, 1.3, 2.3, 3.4, 6.2, 6.3**



- [x] 2. Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Shared Components

- [x] 3. Create shared messaging components
  - [x] 3.1 Create MessageBubbleComponent
    - Create `fe/src/app/shared/components/message-bubble.component.ts`
    - Implement left/right alignment based on sender
    - Display timestamp and read status


    - Support assignment reference card display
    - Use text interpolation `{{ content }}` instead of `[innerHTML]` for XSS protection
    - _Requirements: 1.4, 5.2, 5.4, Security_
  - [ ]* 3.2 Write property test for assignment reference display
    - **Property 7: Assignment Reference Display**
    - **Validates: Requirements 5.2, 5.4**

  - [x] 3.3 Create MessageInputComponent
    - Create `fe/src/app/shared/components/message-input.component.ts`


    - Implement textarea with auto-resize


    - Add send button with loading state
    - Add assignment reference dropdown (optional)
    - Implement Enter key to send
    - _Requirements: 1.2, 5.1_

- [x] 4. Checkpoint - Ensure all tests pass


  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Teacher Messages Tab

- [x] 5. Implement Messages Tab in Student Detail
  - [x] 5.1 Create MessagesTabComponent
    - Create `fe/src/app/features/teacher/students/messages-tab.component.ts`


    - Display conversation history with student


    - Integrate MessageBubbleComponent for messages
    - Integrate MessageInputComponent for composing
    - Auto-scroll to newest message
    - _Requirements: 1.1, 1.4_

  - [x] 5.2 Integrate Messages Tab into Student Detail
    - Update `fe/src/app/features/teacher/students/student-detail.component.ts`
    - Add "Tin nhắn" tab alongside existing tabs
    - Wire up MessagesTabComponent with studentId
    - _Requirements: 1.1_



- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Student Inbox



- [x] 7. Implement Student Inbox
  - [x] 7.1 Create ConversationListItemComponent
    - Create `fe/src/app/features/student/messages/conversation-list-item.component.ts`
    - Display teacher avatar and name
    - Show last message preview and timestamp
    - Display unread count badge


    - _Requirements: 2.4, 2.5_
  - [ ]* 7.2 Write property test for conversation list display
    - **Property 3: Conversation List Display**
    - **Property 8: Conversation Sort Order**
    - **Property 10: Empty Conversation Filtering**
    - **Validates: Requirements 2.4, 6.1, 6.4**

  - [x] 7.3 Create StudentInboxComponent
    - Create `fe/src/app/features/student/messages/student-inbox.component.ts`
    - Display list of conversations with teachers
    - Implement search/filter functionality
    - Sort by most recent message
    - Handle empty state
    - _Requirements: 2.1, 4.1, 6.1_

  - [x] 7.4 Create ConversationViewComponent
    - Create `fe/src/app/features/student/messages/conversation-view.component.ts`
    - Display full message history
    - Integrate MessageBubbleComponent
    - Integrate MessageInputComponent for replies
    - Mark messages as read on open
    - _Requirements: 2.2, 2.3, 3.4_

  - [x] 7.5 Set up student messages routes
    - Create `fe/src/app/features/student/messages/messages.routes.ts`
    - Add route `/student/messages`
    - Add route `/student/messages/:conversationId`
    - Update student sidebar navigation
    - _Requirements: 2.1_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Notifications Integration

- [x] 9. Integrate with Notification System



  - [x] 9.1 Update NotificationService for messages

    - Update `fe/src/app/core/services/notification.service.ts`
    - Add `sendMessageNotification()` method
    - Include sender name and message preview in notification
    - _Requirements: 3.1, 3.2_


  - [x] 9.2 Update NotificationBellComponent

    - Update `fe/src/app/shared/components/notification-bell.component.ts`
    - Handle MESSAGE_RECEIVED notification type
    - Navigate to conversation on click
    - _Requirements: 3.3_


  - [x] 9.3 Add unread messages indicator to sidebar

    - Update student sidebar navigation
    - Show total unread count next to "Tin nhắn" link
    - _Requirements: 3.5_

- [x] 10. Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Final Integration and Polish

- [x] 11. Final integration and cleanup



  - [x] 11.1 Add loading states and error handling

    - Add loading spinners for message fetching
    - Add error messages in Vietnamese
    - Add retry mechanism for failed sends
    - _Requirements: All_


  - [x] 11.2 Add empty states

    - Empty inbox state with helpful message
    - Empty conversation state
    - No search results state
    - _Requirements: 4.4_


  - [x] 11.3 Add Vietnamese translations

    - Ensure all UI text is in Vietnamese
    - Add proper date/time formatting for Vietnamese locale
    - _Requirements: All_

  - [x] 11.4 Update navigation


    - Add "Tin nhắn" link to student sidebar
    - Ensure proper icons and labels
    - _Requirements: 2.1_

  - [x] 11.5 Implement Auto-link detection


    - Detect URLs in message content
    - Convert URLs to clickable `<a>` tags safely
    - Ensure XSS protection using Angular sanitization
    - _Requirements: Security_


  - [x] 11.6 Prepare for future file attachments

    - Add disabled attachment button (kẹp giấy) in MessageInputComponent
    - Reserve space in Message model for attachments
    - Document future implementation plan
    - _Requirements: Future enhancement_


- [x] 12. Final Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.
