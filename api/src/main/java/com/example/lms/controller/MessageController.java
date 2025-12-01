package com.example.lms.controller;

import com.example.lms.dto.ApiResponse;
import com.example.lms.entity.*;
import com.example.lms.service.MessagingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/messages")
@RequiredArgsConstructor
@Tag(name = "Messaging", description = "API nhắn tin giữa giảng viên và học viên")
@SecurityRequirement(name = "Bearer Authentication")
public class MessageController {

    private final MessagingService messagingService;

    @GetMapping("/conversations")
    @Operation(summary = "Lấy danh sách cuộc hội thoại")
    public ResponseEntity<ApiResponse<List<ConversationDTO>>> getConversations(
            @AuthenticationPrincipal User currentUser,
            @RequestParam(defaultValue = "false") boolean includeArchived
    ) {
        try {
            List<Conversation> conversations = messagingService.getConversations(
                currentUser.getId(), includeArchived);
            
            List<ConversationDTO> dtos = conversations.stream()
                .map(c -> toConversationDTO(c, currentUser.getId()))
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(ApiResponse.success(dtos));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Lỗi khi lấy danh sách hội thoại: " + e.getMessage()));
        }
    }

    @GetMapping("/conversations/between")
    @Operation(summary = "Lấy cuộc hội thoại giữa hai người dùng")
    public ResponseEntity<ApiResponse<ConversationDTO>> getConversationBetween(
            @AuthenticationPrincipal User currentUser,
            @RequestParam UUID userId1,
            @RequestParam UUID userId2
    ) {
        try {
            Conversation conversation = messagingService.getConversationBetween(userId1, userId2);
            if (conversation == null) {
                return ResponseEntity.ok(ApiResponse.success(null));
            }
            return ResponseEntity.ok(ApiResponse.success(toConversationDTO(conversation, currentUser.getId())));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Lỗi: " + e.getMessage()));
        }
    }

    @GetMapping("/conversations/{conversationId}/messages")
    @Operation(summary = "Lấy tin nhắn trong cuộc hội thoại")
    public ResponseEntity<ApiResponse<List<MessageDTO>>> getMessages(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            List<Message> messages = messagingService.getMessages(conversationId, currentUser.getId());
            List<MessageDTO> dtos = messages.stream()
                .map(this::toMessageDTO)
                .collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.success(dtos));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/send")
    @Operation(summary = "Gửi tin nhắn")
    public ResponseEntity<ApiResponse<SendMessageResponse>> sendMessage(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody SendMessageRequest request
    ) {
        try {
            Message message = messagingService.sendMessage(
                currentUser.getId(),
                request.getRecipientId(),
                request.getContent(),
                request.getAssignmentId()
            );
            
            SendMessageResponse response = new SendMessageResponse();
            response.setMessage(toMessageDTO(message));
            response.setConversationId(message.getConversation().getId().toString());
            
            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/mark-read")
    @Operation(summary = "Đánh dấu tin nhắn đã đọc")
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody MarkAsReadRequest request
    ) {
        try {
            List<UUID> messageIds = request.getMessageIds().stream()
                .map(UUID::fromString)
                .collect(Collectors.toList());
            messagingService.markAsRead(messageIds, currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/conversations/{conversationId}/mark-all-read")
    @Operation(summary = "Đánh dấu tất cả tin nhắn trong hội thoại đã đọc")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            messagingService.markAllAsRead(conversationId, currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/conversations/{conversationId}/archive")
    @Operation(summary = "Lưu trữ cuộc hội thoại")
    public ResponseEntity<ApiResponse<Void>> archiveConversation(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            messagingService.archiveConversation(conversationId, currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/conversations/{conversationId}/restore")
    @Operation(summary = "Khôi phục cuộc hội thoại đã lưu trữ")
    public ResponseEntity<ApiResponse<Void>> restoreConversation(
            @PathVariable UUID conversationId,
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            messagingService.restoreConversation(conversationId, currentUser.getId());
            return ResponseEntity.ok(ApiResponse.success(null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Lấy số tin nhắn chưa đọc")
    public ResponseEntity<ApiResponse<UnreadCountResponse>> getUnreadCount(
            @AuthenticationPrincipal User currentUser
    ) {
        try {
            long count = messagingService.getUnreadCount(currentUser.getId());
            UnreadCountResponse response = new UnreadCountResponse();
            response.setCount(count);
            return ResponseEntity.ok(ApiResponse.success(response));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Lỗi: " + e.getMessage()));
        }
    }

    @GetMapping("/search")
    @Operation(summary = "Tìm kiếm tin nhắn")
    public ResponseEntity<ApiResponse<List<ConversationDTO>>> searchMessages(
            @AuthenticationPrincipal User currentUser,
            @RequestParam String q
    ) {
        try {
            // For now, return conversations that match the search
            // A more sophisticated implementation would return matching messages
            List<Conversation> conversations = messagingService.getConversations(currentUser.getId(), false);
            List<ConversationDTO> filtered = conversations.stream()
                .filter(c -> {
                    User other = c.getOtherParticipant(currentUser.getId());
                    return other.getFullName().toLowerCase().contains(q.toLowerCase());
                })
                .map(c -> toConversationDTO(c, currentUser.getId()))
                .collect(Collectors.toList());
            return ResponseEntity.ok(ApiResponse.success(filtered));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Lỗi: " + e.getMessage()));
        }
    }

    // DTO Converters
    private ConversationDTO toConversationDTO(Conversation conv, UUID currentUserId) {
        ConversationDTO dto = new ConversationDTO();
        dto.setId(conv.getId().toString());
        
        // Participants
        ParticipantDTO teacher = new ParticipantDTO();
        teacher.setId(conv.getTeacher().getId().toString());
        teacher.setName(conv.getTeacher().getFullName());
        teacher.setRole("TEACHER");
        
        ParticipantDTO student = new ParticipantDTO();
        student.setId(conv.getStudent().getId().toString());
        student.setName(conv.getStudent().getFullName());
        student.setRole("STUDENT");
        
        dto.setParticipants(List.of(teacher, student));
        
        // Last message
        if (conv.getMessages() != null && !conv.getMessages().isEmpty()) {
            Message lastMsg = conv.getMessages().get(conv.getMessages().size() - 1);
            LastMessageDTO lastMessage = new LastMessageDTO();
            lastMessage.setContent(lastMsg.getContent());
            lastMessage.setSenderId(lastMsg.getSender().getId().toString());
            lastMessage.setCreatedAt(toInstant(lastMsg.getCreatedAt()));
            dto.setLastMessage(lastMessage);
        }
        
        // Unread count
        long unread = messagingService.getUnreadCountInConversation(conv.getId(), currentUserId);
        dto.setUnreadCount((int) unread);
        
        dto.setIsArchived(conv.isArchivedFor(currentUserId));
        dto.setCreatedAt(toInstant(conv.getCreatedAt()));
        dto.setUpdatedAt(toInstant(conv.getUpdatedAt()));
        
        return dto;
    }

    private MessageDTO toMessageDTO(Message msg) {
        MessageDTO dto = new MessageDTO();
        dto.setId(msg.getId().toString());
        dto.setConversationId(msg.getConversation().getId().toString());
        dto.setSenderId(msg.getSender().getId().toString());
        dto.setSenderName(msg.getSender().getFullName());
        dto.setSenderRole(msg.getSender().getRole().name());
        dto.setContent(msg.getContent());
        dto.setIsRead(msg.getIsRead());
        dto.setCreatedAt(toInstant(msg.getCreatedAt()));
        
        if (msg.getAssignmentReference() != null) {
            AssignmentReferenceDTO ref = new AssignmentReferenceDTO();
            ref.setAssignmentId(msg.getAssignmentReference().getId().toString());
            ref.setAssignmentTitle(msg.getAssignmentReference().getTitle());
            ref.setCourseId(msg.getAssignmentReference().getCourse().getId().toString());
            ref.setCourseName(msg.getAssignmentReference().getCourse().getTitle());
            dto.setAssignmentReference(ref);
        }
        
        return dto;
    }

    private Instant toInstant(java.time.LocalDateTime ldt) {
        if (ldt == null) return null;
        return ldt.atZone(ZoneId.systemDefault()).toInstant();
    }

    // DTOs
    public static class ConversationDTO {
        private String id;
        private List<ParticipantDTO> participants;
        private LastMessageDTO lastMessage;
        private int unreadCount;
        private boolean isArchived;
        private Instant createdAt;
        private Instant updatedAt;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public List<ParticipantDTO> getParticipants() { return participants; }
        public void setParticipants(List<ParticipantDTO> participants) { this.participants = participants; }
        public LastMessageDTO getLastMessage() { return lastMessage; }
        public void setLastMessage(LastMessageDTO lastMessage) { this.lastMessage = lastMessage; }
        public int getUnreadCount() { return unreadCount; }
        public void setUnreadCount(int unreadCount) { this.unreadCount = unreadCount; }
        public boolean getIsArchived() { return isArchived; }
        public void setIsArchived(boolean isArchived) { this.isArchived = isArchived; }
        public Instant getCreatedAt() { return createdAt; }
        public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
        public Instant getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
    }

    public static class ParticipantDTO {
        private String id;
        private String name;
        private String role;
        private String avatar;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public String getAvatar() { return avatar; }
        public void setAvatar(String avatar) { this.avatar = avatar; }
    }

    public static class LastMessageDTO {
        private String content;
        private String senderId;
        private Instant createdAt;

        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getSenderId() { return senderId; }
        public void setSenderId(String senderId) { this.senderId = senderId; }
        public Instant getCreatedAt() { return createdAt; }
        public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    }

    public static class MessageDTO {
        private String id;
        private String conversationId;
        private String senderId;
        private String senderName;
        private String senderRole;
        private String content;
        private AssignmentReferenceDTO assignmentReference;
        private boolean isRead;
        private Instant createdAt;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getConversationId() { return conversationId; }
        public void setConversationId(String conversationId) { this.conversationId = conversationId; }
        public String getSenderId() { return senderId; }
        public void setSenderId(String senderId) { this.senderId = senderId; }
        public String getSenderName() { return senderName; }
        public void setSenderName(String senderName) { this.senderName = senderName; }
        public String getSenderRole() { return senderRole; }
        public void setSenderRole(String senderRole) { this.senderRole = senderRole; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public AssignmentReferenceDTO getAssignmentReference() { return assignmentReference; }
        public void setAssignmentReference(AssignmentReferenceDTO assignmentReference) { this.assignmentReference = assignmentReference; }
        public boolean getIsRead() { return isRead; }
        public void setIsRead(boolean isRead) { this.isRead = isRead; }
        public Instant getCreatedAt() { return createdAt; }
        public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    }

    public static class AssignmentReferenceDTO {
        private String assignmentId;
        private String assignmentTitle;
        private String courseId;
        private String courseName;

        public String getAssignmentId() { return assignmentId; }
        public void setAssignmentId(String assignmentId) { this.assignmentId = assignmentId; }
        public String getAssignmentTitle() { return assignmentTitle; }
        public void setAssignmentTitle(String assignmentTitle) { this.assignmentTitle = assignmentTitle; }
        public String getCourseId() { return courseId; }
        public void setCourseId(String courseId) { this.courseId = courseId; }
        public String getCourseName() { return courseName; }
        public void setCourseName(String courseName) { this.courseName = courseName; }
    }

    public static class SendMessageRequest {
        @jakarta.validation.constraints.NotNull(message = "ID người nhận không được để trống")
        private UUID recipientId;
        
        @NotBlank(message = "Nội dung tin nhắn không được để trống")
        @Size(max = 5000, message = "Tin nhắn không được vượt quá 5000 ký tự")
        private String content;
        
        private UUID assignmentId;

        public UUID getRecipientId() { return recipientId; }
        public void setRecipientId(UUID recipientId) { this.recipientId = recipientId; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public UUID getAssignmentId() { return assignmentId; }
        public void setAssignmentId(UUID assignmentId) { this.assignmentId = assignmentId; }
    }

    public static class SendMessageResponse {
        private MessageDTO message;
        private String conversationId;

        public MessageDTO getMessage() { return message; }
        public void setMessage(MessageDTO message) { this.message = message; }
        public String getConversationId() { return conversationId; }
        public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    }

    public static class MarkAsReadRequest {
        private List<String> messageIds;

        public List<String> getMessageIds() { return messageIds; }
        public void setMessageIds(List<String> messageIds) { this.messageIds = messageIds; }
    }

    public static class UnreadCountResponse {
        private long count;

        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
    }
}
