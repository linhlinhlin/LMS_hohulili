package com.example.lms.communication.application.usecase;

import com.example.lms.communication.application.dto.MessageRecipientCandidateResponse;
import com.example.lms.communication.application.port.MessageRecipientDirectoryPort;
import com.example.lms.communication.domain.model.Conversation;
import com.example.lms.communication.domain.repository.ConversationRepository;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageAuthorizationService {

    private static final int DEFAULT_LIMIT = 20;
    private static final int MAX_LIMIT = 50;

    private final ConversationRepository conversationRepository;
    private final EnrollmentRepositoryPort enrollmentRepository;
    private final LearningClassRepositoryPort learningClassRepository;
    private final MessageRecipientDirectoryPort recipientDirectoryPort;

    public List<MessageRecipientCandidateResponse> listRecipients(
            ActorContext actor,
            String query,
            String contextTypeRaw,
            UUID contextId,
            Integer limit
    ) {
        RecipientContextType contextType = parseContextType(contextTypeRaw);
        int normalizedLimit = normalizeLimit(limit);
        validateContextAccess(actor, contextType, contextId);

        Map<UUID, Conversation> existingConversations = existingConversationMap(actor.userId());
        Map<UUID, RecipientCandidate> candidates = new LinkedHashMap<>();

        if (contextType == RecipientContextType.RECENT) {
            mergeExistingConversationCandidates(candidates, existingConversations);
            return toResponses(actor, candidates.values(), query, normalizedLimit);
        }

        switch (actor.role()) {
            case STUDENT -> {
                mergeExistingConversationCandidates(candidates, existingConversations);
                mergeStudentTeacherCandidates(candidates, actor, contextType, contextId, existingConversations);
            }
            case TEACHER -> {
                mergeExistingConversationCandidates(candidates, existingConversations);
                mergeTeacherStudentCandidates(candidates, actor, contextType, contextId, existingConversations);
                mergeTeacherAdminCandidates(candidates, actor, existingConversations, query, normalizedLimit);
            }
            case ORG_ADMIN -> {
                mergeExistingConversationCandidates(candidates, existingConversations);
                mergeOrgAdminCandidates(candidates, actor, existingConversations, query, normalizedLimit);
            }
            case ADMIN -> {
                mergeExistingConversationCandidates(candidates, existingConversations);
                mergeAdminCandidates(candidates, existingConversations, query, normalizedLimit);
            }
        }

        return toResponses(actor, candidates.values(), query, normalizedLimit);
    }

    public boolean canSendMessage(ActorContext actor, UUID recipientId) {
        if (actor.userId().equals(recipientId)) {
            return false;
        }
        if (recipientDirectoryPort.findActiveById(recipientId).isEmpty()) {
            return false;
        }
        if (conversationRepository.findByParticipants(actor.userId(), recipientId).isPresent()) {
            return true;
        }
        return canInitiateMessage(actor, recipientId);
    }

    public boolean canInitiateMessage(ActorContext actor, UUID recipientId) {
        return switch (actor.role()) {
            case ADMIN -> recipientDirectoryPort.findActiveById(recipientId).isPresent();
            case ORG_ADMIN -> canOrgAdminInitiate(actor, recipientId);
            case TEACHER -> canTeacherInitiate(actor, recipientId);
            case STUDENT -> canStudentInitiate(actor, recipientId);
        };
    }

    private boolean canStudentInitiate(ActorContext actor, UUID recipientId) {
        return enrollmentRepository.findByStudentId(actor.userId()).stream()
                .filter(Enrollment::isActive)
                .map(Enrollment::getLearningClass)
                .filter(this::isActiveClass)
                .map(LearningClass::getTeacherId)
                .filter(java.util.Objects::nonNull)
                .anyMatch(recipientId::equals);
    }

    private boolean canTeacherInitiate(ActorContext actor, UUID recipientId) {
        if (isRecipientRole(recipientId, Set.of(Role.ADMIN))) {
            return true;
        }
        if (actor.organizationId() != null
                && isRecipientInOrganizationWithRoles(recipientId, actor.organizationId(), Set.of(Role.ORG_ADMIN))) {
            return true;
        }
        return learningClassRepository.findByTeacherId(actor.userId()).stream()
                .filter(this::isActiveClass)
                .flatMap(learningClass -> enrollmentRepository.findByClassId(learningClass.getId()).stream())
                .filter(Enrollment::isActive)
                .map(Enrollment::getStudentId)
                .anyMatch(recipientId::equals);
    }

    private boolean canOrgAdminInitiate(ActorContext actor, UUID recipientId) {
        if (isRecipientRole(recipientId, Set.of(Role.ADMIN))) {
            return true;
        }
        if (actor.organizationId() == null) {
            return false;
        }
        return isRecipientInOrganizationWithRoles(recipientId, actor.organizationId(), Set.of(Role.TEACHER, Role.STUDENT));
    }

    private boolean isRecipientRole(UUID recipientId, Set<Role> roles) {
        return recipientDirectoryPort.findActiveById(recipientId)
                .map(entry -> roles.contains(entry.role()))
                .orElse(false);
    }

    private boolean isRecipientInOrganizationWithRoles(UUID recipientId, UUID organizationId, Set<Role> roles) {
        return recipientDirectoryPort.findActiveById(recipientId)
                .map(entry -> organizationId.equals(entry.organizationId()) && roles.contains(entry.role()))
                .orElse(false);
    }

    private void mergeStudentTeacherCandidates(
            Map<UUID, RecipientCandidate> candidates,
            ActorContext actor,
            RecipientContextType contextType,
            UUID contextId,
            Map<UUID, Conversation> existingConversations
    ) {
        enrollmentRepository.findByStudentId(actor.userId()).stream()
                .filter(Enrollment::isActive)
                .map(Enrollment::getLearningClass)
                .filter(this::isActiveClass)
                .filter(learningClass -> matchesContext(learningClass, contextType, contextId))
                .filter(learningClass -> learningClass.getTeacherId() != null)
                .forEach(learningClass -> mergeCandidate(
                        candidates,
                        RecipientCandidate.forAcademic(
                                learningClass.getTeacherId(),
                                existingConversations.get(learningClass.getTeacherId()),
                                "CLASS_TEACHER",
                                contextTypeLabel(contextType, learningClass),
                                learningClass.getId(),
                                contextLabel(learningClass),
                                1
                        )
                ));
    }

    private void mergeTeacherStudentCandidates(
            Map<UUID, RecipientCandidate> candidates,
            ActorContext actor,
            RecipientContextType contextType,
            UUID contextId,
            Map<UUID, Conversation> existingConversations
    ) {
        learningClassRepository.findByTeacherId(actor.userId()).stream()
                .filter(this::isActiveClass)
                .filter(learningClass -> matchesContext(learningClass, contextType, contextId))
                .forEach(learningClass -> enrollmentRepository.findByClassId(learningClass.getId()).stream()
                        .filter(Enrollment::isActive)
                        .filter(enrollment -> !actor.userId().equals(enrollment.getStudentId()))
                        .forEach(enrollment -> mergeCandidate(
                                candidates,
                                RecipientCandidate.forAcademic(
                                        enrollment.getStudentId(),
                                        existingConversations.get(enrollment.getStudentId()),
                                        "CLASS_STUDENT",
                                        contextTypeLabel(contextType, learningClass),
                                        learningClass.getId(),
                                        contextLabel(learningClass),
                                        1
                                )
                        )));
    }

    private void mergeTeacherAdminCandidates(
            Map<UUID, RecipientCandidate> candidates,
            ActorContext actor,
            Map<UUID, Conversation> existingConversations,
            String query,
            int limit
    ) {
        if (actor.organizationId() != null) {
            recipientDirectoryPort.findActiveByOrganizationAndRoles(
                            actor.organizationId(),
                            Set.of(Role.ORG_ADMIN),
                            query,
                            limit
                    ).forEach(entry -> mergeCandidate(
                            candidates,
                            RecipientCandidate.forDirectory(
                                    entry.userId(),
                                    existingConversations.get(entry.userId()),
                                    "ORG_ADMIN_SCOPE",
                                    "org",
                                    null,
                                    "Quan tri to chuc",
                                    3
                            )
                    ));
        }

        recipientDirectoryPort.findActiveByRoles(Set.of(Role.ADMIN), query, limit)
                .forEach(entry -> mergeCandidate(
                        candidates,
                        RecipientCandidate.forDirectory(
                                entry.userId(),
                                existingConversations.get(entry.userId()),
                                "SYSTEM_ADMIN",
                                "org",
                                null,
                                "Quan tri he thong",
                                4
                        )
                ));
    }

    private void mergeOrgAdminCandidates(
            Map<UUID, RecipientCandidate> candidates,
            ActorContext actor,
            Map<UUID, Conversation> existingConversations,
            String query,
            int limit
    ) {
        if (actor.organizationId() != null) {
            recipientDirectoryPort.findActiveByOrganizationAndRoles(
                            actor.organizationId(),
                            Set.of(Role.TEACHER, Role.STUDENT),
                            query,
                            limit
                    ).forEach(entry -> mergeCandidate(
                            candidates,
                            RecipientCandidate.forDirectory(
                                    entry.userId(),
                                    existingConversations.get(entry.userId()),
                                    entry.role() == Role.TEACHER ? "ORG_TEACHER" : "ORG_STUDENT",
                                    "org",
                                    actor.organizationId(),
                                    "Cung to chuc",
                                    2
                            )
                    ));
        }

        recipientDirectoryPort.findActiveByRoles(Set.of(Role.ADMIN), query, limit)
                .forEach(entry -> mergeCandidate(
                        candidates,
                        RecipientCandidate.forDirectory(
                                entry.userId(),
                                existingConversations.get(entry.userId()),
                                "SYSTEM_ADMIN",
                                "org",
                                null,
                                "Quan tri he thong",
                                4
                        )
                ));
    }

    private void mergeAdminCandidates(
            Map<UUID, RecipientCandidate> candidates,
            Map<UUID, Conversation> existingConversations,
            String query,
            int limit
    ) {
        recipientDirectoryPort.findAllActive(query, limit * 2)
                .forEach(entry -> mergeCandidate(
                        candidates,
                        RecipientCandidate.forDirectory(
                                entry.userId(),
                                existingConversations.get(entry.userId()),
                                "SYSTEM_DIRECTORY",
                                "org",
                                null,
                                "Nguoi dung hoat dong",
                                5
                        )
                ));
    }

    private List<MessageRecipientCandidateResponse> toResponses(
            ActorContext actor,
            Collection<RecipientCandidate> candidates,
            String query,
            int limit
    ) {
        if (candidates.isEmpty()) {
            return List.of();
        }

        Map<UUID, RecipientCandidate> candidateMap = candidates.stream()
                .collect(Collectors.toMap(RecipientCandidate::userId, candidate -> candidate));

        List<MessageRecipientDirectoryPort.RecipientDirectoryEntry> entries =
                recipientDirectoryPort.findActiveByIds(candidateMap.keySet(), query, Math.max(limit * 3, limit));

        return entries.stream()
                .filter(entry -> !actor.userId().equals(entry.userId()))
                .map(entry -> {
                    RecipientCandidate candidate = candidateMap.get(entry.userId());
                    return new MessageRecipientCandidateResponse(
                            entry.userId(),
                            entry.displayName(),
                            entry.email(),
                            entry.role().name(),
                            null,
                            candidate.conversationId(),
                            candidate.relationshipType(),
                            candidate.contextType(),
                            candidate.contextId(),
                            candidate.contextLabel(),
                            true
                    );
                })
                .sorted(Comparator
                        .comparingInt((MessageRecipientCandidateResponse item) -> candidateMap.get(item.userId()).rankBucket())
                        .thenComparing(MessageRecipientCandidateResponse::displayName, String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(MessageRecipientCandidateResponse::userId))
                .limit(limit)
                .toList();
    }

    private void mergeExistingConversationCandidates(Map<UUID, RecipientCandidate> candidates, Map<UUID, Conversation> existingConversations) {
        existingConversations.forEach((peerId, conversation) -> mergeCandidate(
                candidates,
                RecipientCandidate.forExistingConversation(peerId, conversation)
        ));
    }

    private void mergeCandidate(Map<UUID, RecipientCandidate> candidates, RecipientCandidate incoming) {
        RecipientCandidate existing = candidates.get(incoming.userId());
        if (existing == null || incoming.rankBucket() < existing.rankBucket()) {
            candidates.put(incoming.userId(), incoming);
            return;
        }
        if (existing.conversationId() == null && incoming.conversationId() != null) {
            candidates.put(incoming.userId(), existing.withConversationId(incoming.conversationId()));
        }
    }

    private Map<UUID, Conversation> existingConversationMap(UUID userId) {
        Map<UUID, Conversation> map = new LinkedHashMap<>();
        for (Conversation conversation : conversationRepository.findByParticipantId(userId)) {
            UUID otherUserId = conversation.getOtherParticipant(userId);
            map.put(otherUserId, conversation);
        }
        return map;
    }

    private boolean isActiveClass(LearningClass learningClass) {
        return learningClass != null && learningClass.isActive();
    }

    private boolean matchesContext(LearningClass learningClass, RecipientContextType contextType, UUID contextId) {
        if (contextType == RecipientContextType.AUTO || contextType == RecipientContextType.RECENT) {
            return true;
        }
        if (contextId == null) {
            throw new AccessDeniedException("Context id is required");
        }
        return switch (contextType) {
            case CLASS -> learningClass.getId().equals(contextId);
            case COURSE -> learningClass.getCourseId() != null && learningClass.getCourseId().equals(contextId);
            case ORG, SUPPORT -> throw new AccessDeniedException("Unsupported context for academic messaging");
            case AUTO, RECENT -> true;
        };
    }

    private void validateContextAccess(ActorContext actor, RecipientContextType contextType, UUID contextId) {
        if ((contextType == RecipientContextType.CLASS || contextType == RecipientContextType.COURSE) && contextId == null) {
            throw new AccessDeniedException("Context id is required");
        }
        if ((contextType == RecipientContextType.ORG || contextType == RecipientContextType.SUPPORT)
                && actor.role() != Role.ORG_ADMIN
                && actor.role() != Role.ADMIN) {
            throw new AccessDeniedException("Context not allowed");
        }
    }

    private RecipientContextType parseContextType(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return RecipientContextType.AUTO;
        }
        try {
            return RecipientContextType.valueOf(rawValue.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new AccessDeniedException("Invalid recipient context");
        }
    }

    private int normalizeLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_LIMIT;
        }
        return Math.max(1, Math.min(limit, MAX_LIMIT));
    }

    private String contextTypeLabel(RecipientContextType contextType, LearningClass learningClass) {
        if (contextType == RecipientContextType.COURSE) {
            return "course";
        }
        return "class";
    }

    private String contextLabel(LearningClass learningClass) {
        if (learningClass.getName() != null && !learningClass.getName().isBlank()) {
            return learningClass.getName();
        }
        return learningClass.getCode();
    }

    public record ActorContext(UUID userId, Role role, UUID organizationId) {}

    private record RecipientCandidate(
            UUID userId,
            UUID conversationId,
            String relationshipType,
            String contextType,
            UUID contextId,
            String contextLabel,
            int rankBucket
    ) {
        static RecipientCandidate forExistingConversation(UUID userId, Conversation conversation) {
            return new RecipientCandidate(
                    userId,
                    conversation.getId().value(),
                    "EXISTING_CONVERSATION",
                    "recent",
                    null,
                    "Hoi thoai gan day",
                    0
            );
        }

        static RecipientCandidate forAcademic(
                UUID userId,
                Conversation conversation,
                String relationshipType,
                String contextType,
                UUID contextId,
                String contextLabel,
                int rankBucket
        ) {
            return new RecipientCandidate(
                    userId,
                    conversation != null ? conversation.getId().value() : null,
                    relationshipType,
                    contextType,
                    contextId,
                    contextLabel,
                    rankBucket
            );
        }

        static RecipientCandidate forDirectory(
                UUID userId,
                Conversation conversation,
                String relationshipType,
                String contextType,
                UUID contextId,
                String contextLabel,
                int rankBucket
        ) {
            return forAcademic(userId, conversation, relationshipType, contextType, contextId, contextLabel, rankBucket);
        }

        RecipientCandidate withConversationId(UUID newConversationId) {
            return new RecipientCandidate(userId, newConversationId, relationshipType, contextType, contextId, contextLabel, rankBucket);
        }
    }

    private enum RecipientContextType {
        AUTO,
        RECENT,
        CLASS,
        COURSE,
        SUPPORT,
        ORG
    }
}

