# Requirements Document

## Introduction

Hệ thống Nhắn tin Giảng viên - Học viên (Teacher-Student Messaging) cho LMS Maritime. Hệ thống cho phép giảng viên và học viên trao đổi trực tiếp thông qua tin nhắn trong ứng dụng. Tính năng này được tích hợp vào trang Student Detail để giảng viên có thể liên lạc nhanh với học viên về bài tập, tiến độ học tập, hoặc các vấn đề khác.

## Glossary

- **Message**: Tin nhắn văn bản được gửi giữa giảng viên và học viên
- **Conversation**: Cuộc hội thoại giữa một giảng viên và một học viên
- **Thread**: Chuỗi tin nhắn trong một cuộc hội thoại
- **Teacher**: Giảng viên - người gửi/nhận tin nhắn
- **Student**: Học viên - người gửi/nhận tin nhắn
- **Read Status**: Trạng thái đã đọc/chưa đọc của tin nhắn
- **Attachment**: File đính kèm trong tin nhắn (tùy chọn)
- **Inbox**: Hộp thư đến chứa tất cả cuộc hội thoại

## Requirements

### Requirement 1: Gửi tin nhắn từ Student Detail

**User Story:** As a Teacher, I want to send messages to students from their profile page, so that I can communicate directly about their progress or assignments.

#### Acceptance Criteria

1. WHEN a Teacher views a student detail page THEN the System SHALL display a "Messages" tab showing conversation history with that student.
2. WHEN a Teacher types a message and clicks send THEN the System SHALL deliver the message to the student and display it in the conversation.
3. WHEN a message is sent THEN the System SHALL record the timestamp and sender information.
4. WHEN viewing conversation THEN the System SHALL display messages in chronological order with newest at bottom.
5. WHEN a new message is received THEN the System SHALL update the conversation without requiring page refresh.

### Requirement 2: Student Inbox

**User Story:** As a Student, I want to view and respond to messages from teachers, so that I can communicate about my coursework.

#### Acceptance Criteria

1. WHEN a Student navigates to "Messages" section THEN the System SHALL display a list of conversations with teachers.
2. WHEN a Student selects a conversation THEN the System SHALL display the full message history with that teacher.
3. WHEN a Student types a reply and clicks send THEN the System SHALL deliver the message to the teacher.
4. WHEN displaying conversations THEN the System SHALL show teacher name, last message preview, and timestamp.
5. WHEN a conversation has unread messages THEN the System SHALL display a visual indicator showing unread count.

### Requirement 3: Message Notifications

**User Story:** As a User, I want to be notified when I receive new messages, so that I can respond promptly.

#### Acceptance Criteria

1. WHEN a new message is received THEN the System SHALL create an in-app notification for the recipient.
2. WHEN displaying notification THEN the System SHALL show sender name and message preview.
3. WHEN a user clicks the notification THEN the System SHALL navigate to the conversation.
4. WHEN a user reads a message THEN the System SHALL mark it as read and update the unread count.
5. WHEN displaying unread count THEN the System SHALL show the total number of unread messages across all conversations.

### Requirement 4: Message Search and Filter

**User Story:** As a User, I want to search through my messages, so that I can find specific conversations or information quickly.

#### Acceptance Criteria

1. WHEN a User enters text in the search box THEN the System SHALL filter conversations containing that text.
2. WHEN searching THEN the System SHALL search in message content, sender name, and subject.
3. WHEN displaying search results THEN the System SHALL highlight matching text in the results.
4. WHEN no results are found THEN the System SHALL display a helpful empty state message.

### Requirement 5: Message Context (Assignment Reference)

**User Story:** As a Teacher, I want to reference specific assignments in messages, so that students understand the context of my feedback.

#### Acceptance Criteria

1. WHEN composing a message THEN the System SHALL provide an option to attach assignment reference.
2. WHEN an assignment is referenced THEN the System SHALL display assignment title and link in the message.
3. WHEN a Student clicks the assignment link THEN the System SHALL navigate to that assignment detail page.
4. WHEN viewing messages with assignment references THEN the System SHALL display the assignment context clearly.

### Requirement 6: Conversation Management

**User Story:** As a User, I want to manage my conversations, so that I can keep my inbox organized.

#### Acceptance Criteria

1. WHEN viewing inbox THEN the System SHALL sort conversations by most recent message first.
2. WHEN a User archives a conversation THEN the System SHALL move it to archived section.
3. WHEN viewing archived conversations THEN the System SHALL allow restoring to active inbox.
4. WHEN a conversation is empty THEN the System SHALL not display it in the inbox.

