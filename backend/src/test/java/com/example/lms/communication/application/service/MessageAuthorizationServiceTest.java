package com.example.lms.communication.application.service;

import com.example.lms.communication.application.port.MessageRecipientDirectoryPort;
import com.example.lms.communication.domain.model.Conversation;
import com.example.lms.communication.domain.model.ConversationId;
import com.example.lms.communication.domain.repository.ConversationRepository;
import com.example.lms.identity.domain.model.Role;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepositoryPort;
import com.example.lms.learning_delivery.domain.repository.LearningClassRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MessageAuthorizationServiceTest {

    @Mock private ConversationRepository conversationRepository;
    @Mock private EnrollmentRepositoryPort enrollmentRepository;
    @Mock private LearningClassRepositoryPort learningClassRepository;
    @Mock private MessageRecipientDirectoryPort recipientDirectoryPort;

    @InjectMocks
    private MessageAuthorizationService service;

    private UUID studentId;
    private UUID teacherId;
    private UUID classId;
    private UUID organizationId;

    @BeforeEach
    void setUp() {
        studentId = UUID.randomUUID();
        teacherId = UUID.randomUUID();
        classId = UUID.randomUUID();
        organizationId = UUID.randomUUID();
    }

    @Test
    @DisplayName("student can discover teacher of active class")
    void studentCanDiscoverTeacherOfActiveClass() {
        LearningClass learningClass = LearningClass.builder()
                .id(classId)
                .name("ECDIS-2026B")
                .courseId(UUID.randomUUID())
                .teacherId(teacherId)
                .status(LearningClass.ClassStatus.OPEN)
                .build();

        Enrollment enrollment = Enrollment.builder()
                .id(UUID.randomUUID())
                .studentId(studentId)
                .learningClass(learningClass)
                .status(Enrollment.EnrollmentStatus.ACTIVE)
                .build();

        when(conversationRepository.findByParticipantId(studentId)).thenReturn(List.of());
        when(enrollmentRepository.findByStudentId(studentId)).thenReturn(List.of(enrollment));
        when(recipientDirectoryPort.findActiveByIds(Set.of(teacherId), null, 60))
                .thenReturn(List.of(new MessageRecipientDirectoryPort.RecipientDirectoryEntry(
                        teacherId,
                        "Teacher A",
                        "teacher@maritime.edu",
                        Role.TEACHER,
                        organizationId
                )));

        var results = service.listRecipients(
                new MessageAuthorizationService.ActorContext(studentId, Role.STUDENT, organizationId),
                null,
                "auto",
                null,
                20
        );

        assertThat(results).hasSize(1);
        assertThat(results.get(0).relationshipType()).isEqualTo("CLASS_TEACHER");
        assertThat(results.get(0).displayName()).isEqualTo("Teacher A");
    }

    @Test
    @DisplayName("teacher can send to existing conversation peer even when not currently discoverable")
    void teacherCanSendToExistingConversationPeer() {
        UUID oldStudentId = UUID.randomUUID();
        Conversation conversation = Conversation.reconstitute(
                ConversationId.of(UUID.randomUUID()),
                teacherId,
                oldStudentId,
                "Hello",
                Instant.now(),
                false,
                false,
                Instant.now(),
                Instant.now()
        );

        when(recipientDirectoryPort.findActiveById(oldStudentId))
                .thenReturn(Optional.of(new MessageRecipientDirectoryPort.RecipientDirectoryEntry(
                        oldStudentId,
                        "Old Student",
                        "old@student.edu",
                        Role.STUDENT,
                        organizationId
                )));
        when(conversationRepository.findByParticipants(teacherId, oldStudentId)).thenReturn(Optional.of(conversation));

        boolean allowed = service.canSendMessage(
                new MessageAuthorizationService.ActorContext(teacherId, Role.TEACHER, organizationId),
                oldStudentId
        );

        assertThat(allowed).isTrue();
    }

    @Test
    @DisplayName("student cannot initiate message to unrelated student")
    void studentCannotInitiateMessageToUnrelatedStudent() {
        UUID otherStudentId = UUID.randomUUID();

        when(enrollmentRepository.findByStudentId(studentId)).thenReturn(List.of());
        when(recipientDirectoryPort.findActiveById(otherStudentId))
                .thenReturn(Optional.of(new MessageRecipientDirectoryPort.RecipientDirectoryEntry(
                        otherStudentId,
                        "Other Student",
                        "other@student.edu",
                        Role.STUDENT,
                        organizationId
                )));
        when(conversationRepository.findByParticipants(studentId, otherStudentId)).thenReturn(Optional.empty());

        boolean allowed = service.canSendMessage(
                new MessageAuthorizationService.ActorContext(studentId, Role.STUDENT, organizationId),
                otherStudentId
        );

        assertThat(allowed).isFalse();
    }
}
