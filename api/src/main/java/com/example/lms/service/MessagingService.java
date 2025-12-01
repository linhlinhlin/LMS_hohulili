package com.example.lms.service;

import com.example.lms.entity.*;
import com.example.lms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MessagingService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final AssignmentRepository assignmentRepository;

    /**
     * Get all conversations for a user
     */
    public List<Conversation> getConversations(UUID userId, boolean includeArchived) {
        return conversationRepository.findByUserId(userId, includeArchived);
    }

    /**
     * Get or create conversation between two users
     */
    public Conversation getOrCreateConversation(UUID userId1, UUID userId2) {
        // Try to find existing conversation
        return conversationRepository.findByParticipants(userId1, userId2)
            .orElseGet(() -> createConversation(userId1, userId2));
    }

    /**
     * Get conversation by ID
     */
    public Conversation getConversationById(UUID conversationId, UUID currentUserId) {
        Conversation conversation = conversationRepository.findById(conversationId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy cuộc hội thoại"));
        
        // Verify user is participant
        if (!conversation.getTeacher().getId().equals(currentUserId) && 
            !conversation.getStudent().getId().equals(currentUserId)) {
            throw new RuntimeException("Bạn không có quyền truy cập cuộc hội thoại này");
        }
        
        return conversation;
    }

    /**
     * Get conversation between two users
     */
    public Conversation getConversationBetween(UUID userId1, UUID userId2) {
        return conversationRepository.findByParticipants(userId1, userId2).orElse(null);
    }

    /**
     * Get messages in a conversation
     */
    public List<Message> getMessages(UUID conversationId, UUID currentUserId) {
        // Verify access
        getConversationById(conversationId, currentUserId);
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    /**
     * Send a message
     */
    public Message sendMessage(UUID senderId, UUID recipientId, String content, UUID assignmentId) {
        if (content == null || content.trim().isEmpty()) {
            throw new RuntimeException("Nội dung tin nhắn không được để trống");
        }
        if (content.length() > 5000) {
            throw new RuntimeException("Tin nhắn không được vượt quá 5000 ký tự");
        }

        User sender = userRepository.findById(senderId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy người gửi"));
        User recipient = userRepository.findById(recipientId)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy người nhận"));

        // Get or create conversation
        Conversation conversation = getOrCreateConversation(senderId, recipientId);

        // Build message
        Message.MessageBuilder messageBuilder = Message.builder()
            .conversation(conversation)
            .sender(sender)
            .content(content.trim())
            .isRead(false);

        // Add assignment reference if provided
        if (assignmentId != null) {
            Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập"));
            messageBuilder.assignmentReference(assignment);
        }

        Message message = messageBuilder.build();
        message = messageRepository.save(message);

        // Update conversation timestamp
        conversation.setUpdatedAt(message.getCreatedAt());
        conversationRepository.save(conversation);

        return message;
    }

    /**
     * Mark messages as read
     */
    public void markAsRead(List<UUID> messageIds, UUID currentUserId) {
        if (messageIds == null || messageIds.isEmpty()) return;
        messageRepository.markAsRead(messageIds);
    }

    /**
     * Mark all messages in a conversation as read
     */
    public void markAllAsRead(UUID conversationId, UUID currentUserId) {
        // Verify access
        getConversationById(conversationId, currentUserId);
        messageRepository.markAllAsReadInConversation(conversationId, currentUserId);
    }

    /**
     * Archive a conversation
     */
    public void archiveConversation(UUID conversationId, UUID userId) {
        Conversation conversation = getConversationById(conversationId, userId);
        
        if (conversation.getTeacher().getId().equals(userId)) {
            conversation.setIsArchivedByTeacher(true);
        } else {
            conversation.setIsArchivedByStudent(true);
        }
        
        conversationRepository.save(conversation);
    }

    /**
     * Restore an archived conversation
     */
    public void restoreConversation(UUID conversationId, UUID userId) {
        Conversation conversation = getConversationById(conversationId, userId);
        
        if (conversation.getTeacher().getId().equals(userId)) {
            conversation.setIsArchivedByTeacher(false);
        } else {
            conversation.setIsArchivedByStudent(false);
        }
        
        conversationRepository.save(conversation);
    }

    /**
     * Get unread count for a user
     */
    public long getUnreadCount(UUID userId) {
        return conversationRepository.countUnreadMessages(userId);
    }

    /**
     * Get unread count for a specific conversation
     */
    public long getUnreadCountInConversation(UUID conversationId, UUID userId) {
        return messageRepository.countUnreadInConversation(conversationId, userId);
    }

    /**
     * Search messages
     */
    public List<Message> searchMessages(UUID userId, String query) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }
        return messageRepository.searchMessages(userId, query.trim());
    }

    /**
     * Create a new conversation between two users
     */
    private Conversation createConversation(UUID userId1, UUID userId2) {
        User user1 = userRepository.findById(userId1)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));
        User user2 = userRepository.findById(userId2)
            .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // Determine teacher and student based on roles
        User teacher, student;
        if ("TEACHER".equals(user1.getRole().name())) {
            teacher = user1;
            student = user2;
        } else if ("TEACHER".equals(user2.getRole().name())) {
            teacher = user2;
            student = user1;
        } else {
            throw new RuntimeException("Cuộc hội thoại phải có ít nhất một giảng viên");
        }

        Conversation conversation = Conversation.builder()
            .teacher(teacher)
            .student(student)
            .isArchivedByTeacher(false)
            .isArchivedByStudent(false)
            .build();

        return conversationRepository.save(conversation);
    }
}
