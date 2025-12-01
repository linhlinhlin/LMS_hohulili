# Requirements Document

## Introduction

Tính năng AI Chatbot Integration tích hợp Maritime AI Chatbot vào hệ thống LMS Hàng Hải, cung cấp trợ lý AI thông minh cho tất cả người dùng (student, teacher, admin, guest). Chatbot được thiết kế theo phong cách Notion với hai chế độ hiển thị: floating bubble để chat nhanh và trang chat riêng để trò chuyện chi tiết. AI được tối ưu hóa cho lĩnh vực hàng hải với khả năng trả lời câu hỏi về COLREGs, luật hàng hải, kỹ thuật tàu biển và các chủ đề liên quan.

## Glossary

- **AI_Chatbot_System**: Hệ thống chatbot AI tích hợp trong LMS, bao gồm floating bubble và trang chat riêng
- **Floating_Chat_Bubble**: Component hình tròn cố định ở góc màn hình, cho phép mở chat nhanh
- **Chat_Panel**: Panel chat popup xuất hiện khi click vào floating bubble
- **Chat_Page**: Trang chat riêng biệt với giao diện đầy đủ
- **Maritime_AI_Backend**: API backend AI đã deploy tại `https://maritime-ai-chatbot.onrender.com`
- **Chat_Message**: Đối tượng chứa nội dung tin nhắn, người gửi, thời gian và metadata
- **Chat_Session**: Phiên chat được định danh bởi session_id, lưu trữ lịch sử hội thoại
- **Suggested_Questions**: Danh sách câu hỏi gợi ý được AI trả về sau mỗi response
- **Message_Sources**: Nguồn tham khảo được AI trích dẫn trong câu trả lời
- **User_Role**: Vai trò người dùng (student/teacher/admin/guest) ảnh hưởng đến cách AI phản hồi

## Requirements

### Requirement 1: Floating Chat Bubble

**User Story:** As a user, I want to see a floating chat bubble on the screen, so that I can quickly access the AI chatbot from any page.

#### Acceptance Criteria

1. WHEN a user visits any page in the LMS THEN the AI_Chatbot_System SHALL display a Floating_Chat_Bubble at the bottom-right corner of the viewport
2. WHEN a user hovers over the Floating_Chat_Bubble THEN the AI_Chatbot_System SHALL display a tooltip with text "Trợ lý AI Hàng Hải"
3. WHEN a user clicks the Floating_Chat_Bubble THEN the AI_Chatbot_System SHALL open the Chat_Panel with smooth animation
4. WHEN the Chat_Panel is open THEN the Floating_Chat_Bubble SHALL transform into a close button
5. WHILE the user is on a mobile device with viewport width less than 768px THEN the Floating_Chat_Bubble SHALL have a diameter of 48 pixels
6. WHILE the user is on a desktop device with viewport width 768px or greater THEN the Floating_Chat_Bubble SHALL have a diameter of 56 pixels

### Requirement 2: Chat Panel (Quick Chat)

**User Story:** As a user, I want to chat with AI in a popup panel, so that I can get quick answers without leaving my current page.

#### Acceptance Criteria

1. WHEN the Chat_Panel opens THEN the AI_Chatbot_System SHALL display a panel with dimensions 380px width and 520px height on desktop
2. WHEN the Chat_Panel opens THEN the AI_Chatbot_System SHALL display previous messages from the current Chat_Session
3. WHEN a user types a message and presses Enter or clicks send button THEN the AI_Chatbot_System SHALL send the message to Maritime_AI_Backend
4. WHEN the AI_Chatbot_System receives a response from Maritime_AI_Backend THEN the system SHALL render the answer with Markdown formatting
5. WHEN the AI_Chatbot_System receives Suggested_Questions from Maritime_AI_Backend THEN the system SHALL display clickable suggestion chips below the response
6. WHEN a user clicks a suggestion chip THEN the AI_Chatbot_System SHALL send that question as a new message
7. WHEN a user clicks the "Mở rộng" button in Chat_Panel THEN the AI_Chatbot_System SHALL navigate to the Chat_Page
8. IF the Maritime_AI_Backend returns an error THEN the AI_Chatbot_System SHALL display an appropriate error message with retry option

### Requirement 3: Chat Page (Full Page Chat)

**User Story:** As a user, I want to access a dedicated chat page, so that I can have detailed conversations with the AI in a focused environment.

#### Acceptance Criteria

1. WHEN a user navigates to the chat page route THEN the AI_Chatbot_System SHALL display a full-page chat interface
2. WHEN the Chat_Page loads THEN the AI_Chatbot_System SHALL display the complete chat history for the current user
3. WHEN a user sends a message on Chat_Page THEN the AI_Chatbot_System SHALL display a typing indicator while waiting for response
4. WHEN the AI_Chatbot_System receives Message_Sources in the response THEN the system SHALL display expandable source citations
5. WHEN a user clicks on a source citation THEN the AI_Chatbot_System SHALL expand to show the source content
6. WHEN a user clicks "Cuộc trò chuyện mới" button THEN the AI_Chatbot_System SHALL create a new Chat_Session and clear the chat display

### Requirement 4: Message Handling and Display

**User Story:** As a user, I want my messages to be displayed clearly with proper formatting, so that I can easily read and understand the conversation.

#### Acceptance Criteria

1. WHEN a user sends a message THEN the AI_Chatbot_System SHALL display the message aligned to the right with user avatar
2. WHEN the AI_Chatbot_System receives a response THEN the system SHALL display the AI message aligned to the left with AI avatar
3. WHEN the AI response contains Markdown syntax THEN the AI_Chatbot_System SHALL render headings, bold, italic, lists, and code blocks correctly
4. WHEN a message is being sent THEN the AI_Chatbot_System SHALL display a loading state on the send button
5. WHEN the AI is generating a response THEN the AI_Chatbot_System SHALL display an animated typing indicator
6. WHEN a message fails to send THEN the AI_Chatbot_System SHALL display the message with error state and retry button

### Requirement 5: Role-Based AI Behavior

**User Story:** As a user with a specific role, I want the AI to respond appropriately to my role, so that I receive relevant and helpful answers.

#### Acceptance Criteria

1. WHEN a student sends a message THEN the AI_Chatbot_System SHALL include role "student" in the API request
2. WHEN a teacher sends a message THEN the AI_Chatbot_System SHALL include role "teacher" in the API request
3. WHEN an admin sends a message THEN the AI_Chatbot_System SHALL include role "admin" in the API request
4. WHEN a guest (unauthenticated user) sends a message THEN the AI_Chatbot_System SHALL include role "guest" in the API request
5. WHEN the AI_Chatbot_System sends a request THEN the system SHALL include the current user_id from authentication service

### Requirement 6: Session and Context Management

**User Story:** As a user, I want my chat context to be preserved, so that the AI can provide relevant answers based on my learning context.

#### Acceptance Criteria

1. WHEN a user starts a new conversation THEN the AI_Chatbot_System SHALL generate a unique session_id
2. WHEN a user sends a message from a course page THEN the AI_Chatbot_System SHALL include course_id in the context
3. WHEN a user sends a message from a lesson page THEN the AI_Chatbot_System SHALL include lesson_id in the context
4. WHEN a user returns to the chat THEN the AI_Chatbot_System SHALL restore the previous Chat_Session messages
5. WHEN a user explicitly starts a new conversation THEN the AI_Chatbot_System SHALL generate a new session_id and clear context

### Requirement 7: Performance and Reliability

**User Story:** As a user, I want the chatbot to be responsive and reliable, so that I can get answers without frustrating delays.

#### Acceptance Criteria

1. WHEN the AI_Chatbot_System initializes THEN the system SHALL call the health check endpoint to verify backend availability
2. IF the health check fails THEN the AI_Chatbot_System SHALL display a "Service unavailable" message with estimated recovery time
3. WHEN a request takes longer than 5 seconds THEN the AI_Chatbot_System SHALL display a "Đang xử lý, vui lòng đợi..." message
4. WHEN a request times out after 60 seconds THEN the AI_Chatbot_System SHALL display a timeout error with retry option
5. WHEN the backend is in cold start state THEN the AI_Chatbot_System SHALL display a warm-up message explaining the delay

### Requirement 8: Chat Message Serialization

**User Story:** As a developer, I want chat messages to be properly serialized and deserialized, so that chat history can be persisted and restored correctly.

#### Acceptance Criteria

1. WHEN the AI_Chatbot_System stores a Chat_Message THEN the system SHALL serialize it to JSON format
2. WHEN the AI_Chatbot_System loads chat history THEN the system SHALL deserialize JSON to Chat_Message objects
3. WHEN serializing a Chat_Message THEN the AI_Chatbot_System SHALL include id, content, sender, timestamp, and metadata fields
4. WHEN deserializing a Chat_Message THEN the AI_Chatbot_System SHALL validate all required fields exist
5. WHEN the AI_Chatbot_System prints a Chat_Message for display THEN the system SHALL format it with proper structure
