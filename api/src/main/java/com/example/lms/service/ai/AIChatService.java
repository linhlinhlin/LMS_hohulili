package com.example.lms.service.ai;

import com.example.lms.config.AIServiceConfig;
import com.example.lms.dto.ai.*;
import com.example.lms.dto.ai.external.*;
import com.example.lms.entity.ChatMessage;
import com.example.lms.entity.ChatMessage.MessageStatus;
import com.example.lms.entity.ChatMessage.SenderType;
import com.example.lms.entity.ChatSession;
import com.example.lms.entity.User;
import com.example.lms.repository.ChatMessageRepository;
import com.example.lms.repository.ChatSessionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service xử lý business logic cho AI Chat.
 * Bao gồm: gửi tin nhắn, quản lý session, lưu history.
 */
@Service
@Transactional
public class AIChatService {
    
    private static final Logger log = LoggerFactory.getLogger(AIChatService.class);
    private static final int MAX_TITLE_LENGTH = 50;
    
    private final AIServiceClient aiServiceClient;
    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final ObjectMapper objectMapper;
    
    public AIChatService(
            AIServiceClient aiServiceClient,
            ChatSessionRepository sessionRepository,
            ChatMessageRepository messageRepository,
            ObjectMapper objectMapper) {
        this.aiServiceClient = aiServiceClient;
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.objectMapper = objectMapper;
    }
    
    /**
     * Gửi tin nhắn và nhận response từ AI.
     * Tự động tạo session nếu chưa có.
     */
    public ChatResponseDTO sendMessage(User user, ChatRequestDTO request) {
        // Validate message
        validateMessage(request.message());
        
        // Get or create session
        ChatSession session = getOrCreateSession(user, request.sessionId(), request.context());
        
        // Save user message
        ChatMessage userMessage = saveUserMessage(session, request.message());
        
        // Call AI Service
        AIServiceRequest aiRequest = buildAIRequest(user, request, session);
        log.debug("Calling AI Service with request: userId={}, sessionId={}", 
            aiRequest.userId(), aiRequest.sessionId());
        
        AIServiceResponse aiResponse = aiServiceClient.chat(aiRequest);
        
        // Validate AI response
        if (aiResponse == null || aiResponse.data() == null) {
            log.error("AI Service returned null or empty response");
            throw new RuntimeException("AI Service trả về response không hợp lệ");
        }
        
        log.debug("AI Service responded successfully: answer length={}", 
            aiResponse.data().answer() != null ? aiResponse.data().answer().length() : 0);
        
        // Save AI response
        ChatMessage aiMessage = saveAIResponse(session, aiResponse);
        
        // Update session
        session.setUpdatedAt(java.time.Instant.now());
        if (session.getTitle() == null) {
            session.setTitle(generateTitle(request.message()));
        }
        sessionRepository.save(session);
        
        // Build response
        return buildChatResponse(session, aiMessage, aiResponse);
    }
    
    /**
     * Validate message không empty hoặc whitespace
     */
    private void validateMessage(String message) {
        if (message == null || message.isBlank()) {
            throw new IllegalArgumentException("Message không được để trống");
        }
    }
    
    /**
     * Get existing session hoặc tạo mới
     */
    public ChatSession getOrCreateSession(User user, UUID sessionId, ChatContextDTO context) {
        if (sessionId != null) {
            return sessionRepository.findByIdAndUserAndIsDeletedFalse(sessionId, user)
                .orElseThrow(() -> new SessionNotFoundException("Session không tồn tại: " + sessionId));
        }
        
        // Create new session
        ChatSession session = ChatSession.builder()
            .user(user)
            .contextCourseId(context != null ? context.courseId() : null)
            .contextLessonId(context != null ? context.lessonId() : null)
            .build();
        
        return sessionRepository.save(session);
    }
    
    /**
     * Lưu user message vào database
     */
    private ChatMessage saveUserMessage(ChatSession session, String content) {
        ChatMessage message = ChatMessage.builder()
            .session(session)
            .content(content)
            .senderType(SenderType.USER)
            .status(MessageStatus.SENT)
            .build();
        
        return messageRepository.save(message);
    }
    
    /**
     * Lưu AI response vào database với đầy đủ analytics data.
     * Updated: 10/12/2025 - Thêm analytics fields
     */
    private ChatMessage saveAIResponse(ChatSession session, AIServiceResponse response) {
        String sourcesJson = serializeSources(response.data().sources());
        
        // Extract analytics data from metadata
        AIMetadataResponse metadata = response.metadata();
        String topicsJson = serializeStringList(metadata != null ? metadata.topicsAccessed() : null);
        String docIdsJson = serializeStringList(metadata != null ? metadata.documentIdsUsed() : null);
        
        ChatMessage message = ChatMessage.builder()
            .session(session)
            .content(response.data().answer())
            .senderType(SenderType.AI)
            .status(MessageStatus.SENT)
            .sources(sourcesJson)
            .processingTime(metadata != null ? metadata.processingTime() : null)
            .aiModel(metadata != null ? metadata.model() : null)
            // Analytics fields
            .topicsAccessed(topicsJson)
            .confidenceScore(metadata != null ? metadata.confidenceScore() : null)
            .documentIdsUsed(docIdsJson)
            .queryType(metadata != null ? metadata.queryType() : null)
            .build();
        
        return messageRepository.save(message);
    }
    
    /**
     * Build request cho AI Service
     */
    private AIServiceRequest buildAIRequest(User user, ChatRequestDTO request, ChatSession session) {
        String role = mapUserRole(user);
        AIContextRequest context = null;
        
        if (request.context() != null) {
            context = new AIContextRequest(
                request.context().courseId() != null ? request.context().courseId().toString() : null,
                request.context().lessonId() != null ? request.context().lessonId().toString() : null
            );
        }
        
        return AIServiceRequest.create(
            user.getId().toString(),
            request.message(),
            role,
            session.getId().toString(),
            context
        );
    }
    
    /**
     * Map user role từ LMS sang AI Service format
     */
    private String mapUserRole(User user) {
        // Giả sử User có method getRole() trả về role
        // Nếu không có, default là "student"
        try {
            String role = user.getRole().name().toLowerCase();
            if ("admin".equals(role) || "teacher".equals(role) || "student".equals(role)) {
                return role;
            }
        } catch (Exception e) {
            log.debug("Could not get user role, defaulting to student");
        }
        return "student";
    }
    
    /**
     * Generate title từ first message
     */
    public String generateTitle(String message) {
        if (message == null) return "New Chat";
        
        String title = message.trim();
        if (title.length() > MAX_TITLE_LENGTH) {
            return title.substring(0, MAX_TITLE_LENGTH - 3) + "...";
        }
        return title;
    }
    
    /**
     * Serialize sources to JSON với đầy đủ bounding boxes.
     * Updated: 10/12/2025 - Sử dụng SourceDTO.fromAISource()
     */
    private String serializeSources(List<AISourceResponse> sources) {
        if (sources == null || sources.isEmpty()) {
            return null;
        }
        try {
            List<SourceDTO> sourceDTOs = sources.stream()
                .map(SourceDTO::fromAISource)
                .toList();
            return objectMapper.writeValueAsString(sourceDTOs);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize sources", e);
            return null;
        }
    }
    
    /**
     * Serialize string list to JSON
     */
    private String serializeStringList(List<String> list) {
        if (list == null || list.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialize string list", e);
            return null;
        }
    }
    
    /**
     * Build response DTO với đầy đủ source data cho frontend.
     * Updated: 10/12/2025 - Sử dụng SourceDTO.fromAISource() để include bounding boxes
     */
    private ChatResponseDTO buildChatResponse(ChatSession session, ChatMessage aiMessage, AIServiceResponse aiResponse) {
        List<SourceDTO> sources = aiResponse.data().sources() != null
            ? aiResponse.data().sources().stream()
                .map(SourceDTO::fromAISource)
                .toList()
            : List.of();
        
        MetadataDTO metadata = new MetadataDTO(
            aiResponse.metadata() != null ? aiResponse.metadata().processingTime() : 0
        );
        
        ChatDataDTO data = new ChatDataDTO(
            session.getId(),
            aiMessage.getId(),
            aiResponse.data().answer(),
            sources,
            aiResponse.data().suggestedQuestions(),
            metadata
        );
        
        return ChatResponseDTO.success(data);
    }
    
    // ========== Session Management Methods ==========
    
    /**
     * Lấy danh sách sessions của user (paginated)
     */
    @Transactional(readOnly = true)
    public Page<ChatSessionDTO> getUserSessions(User user, Pageable pageable) {
        return sessionRepository.findByUserAndIsDeletedFalseOrderByUpdatedAtDesc(user, pageable)
            .map(ChatSessionDTO::fromEntity);
    }
    
    /**
     * Lấy chi tiết session với messages
     */
    @Transactional(readOnly = true)
    public ChatSessionDetailDTO getSessionDetail(User user, UUID sessionId) {
        ChatSession session = sessionRepository.findByIdWithMessages(sessionId, user)
            .orElseThrow(() -> new SessionNotFoundException("Session không tồn tại: " + sessionId));
        
        return ChatSessionDetailDTO.fromEntity(session);
    }
    
    /**
     * Soft delete session
     */
    public void deleteSession(User user, UUID sessionId) {
        ChatSession session = sessionRepository.findByIdAndUserAndIsDeletedFalse(sessionId, user)
            .orElseThrow(() -> new SessionNotFoundException("Session không tồn tại: " + sessionId));
        
        session.setDeleted(true);
        sessionRepository.save(session);
        
        log.info("Soft deleted session: {}", sessionId);
    }
    
    // ========== Health Check ==========
    
    /**
     * Kiểm tra health của AI Service
     */
    public HealthStatusDTO checkHealth() {
        AIHealthResponse health = aiServiceClient.health();
        
        if (health != null && health.isHealthy()) {
            return HealthStatusDTO.healthy(health.version());
        }
        
        return HealthStatusDTO.degraded("AI Service không khả dụng");
    }
}
