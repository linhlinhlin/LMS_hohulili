package com.example.lms.shared.application.usecase;

import com.example.lms.assessment.application.usecase.QuizAttemptUseCase;
import com.example.lms.assessment.domain.model.QuizAttempt;
import com.example.lms.learning_delivery.application.dto.UpdateLessonProgressCommand;
import com.example.lms.learning_delivery.application.usecase.TrackVideoProgressUseCase;
import com.example.lms.learning_delivery.application.usecase.UpdateLessonProgressUseCase;
import com.example.lms.learning_delivery.domain.model.Enrollment;
import com.example.lms.learning_delivery.domain.model.VideoProgress;
import com.example.lms.learning_delivery.domain.repository.EnrollmentRepository;
import com.example.lms.learning_delivery.domain.repository.VideoProgressRepository;
import com.example.lms.shared.application.dto.SyncPushRequest;
import com.example.lms.shared.application.dto.SyncPushRequest.SyncOperation;
import com.example.lms.shared.application.dto.SyncResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SyncUseCase Tests")
class SyncUseCaseTest {

    @Mock private TrackVideoProgressUseCase videoProgressUseCase;
    @Mock private UpdateLessonProgressUseCase lessonProgressUseCase;
    @Mock private QuizAttemptUseCase quizAttemptUseCase;
    @Mock private EnrollmentRepository enrollmentRepository;
    @Mock private VideoProgressRepository videoProgressRepository;

    @InjectMocks
    private SyncUseCase useCase;

    private static final String USER_ID = UUID.randomUUID().toString();
    private static final UUID STUDENT_ID = UUID.fromString(USER_ID);

    // ─── pushChanges ─────────────────────────────────────────────────

    @Nested
    @DisplayName("pushChanges - General")
    class PushChangesGeneralTests {

        @Test
        @DisplayName("Should return success(0) when operations list is null")
        void shouldReturnSuccessWhenNull() {
            SyncPushRequest request = new SyncPushRequest(null);
            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.accepted()).isZero();
            assertThat(result.rejected()).isZero();
            assertThat(result.conflicts()).isEmpty();
        }

        @Test
        @DisplayName("Should return success(0) when operations list is empty")
        void shouldReturnSuccessWhenEmpty() {
            SyncPushRequest request = new SyncPushRequest(List.of());
            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.accepted()).isZero();
        }

        @Test
        @DisplayName("Should reject unknown entity types with conflict")
        void shouldRejectUnknownEntityType() {
            SyncOperation op = new SyncOperation("unknownType", "CREATE", "/api/test", Map.of());
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.rejected()).isEqualTo(1);
            assertThat(result.conflicts()).hasSize(1);
            assertThat(result.conflicts().get(0).entityType()).isEqualTo("unknownType");
        }
    }

    // ─── pushChanges - videoProgress ─────────────────────────────────

    @Nested
    @DisplayName("pushChanges - videoProgress")
    class PushVideoProgressTests {

        @Test
        @DisplayName("Should route video progress to TrackVideoProgressUseCase")
        void shouldRouteToVideoProgressUseCase() {
            UUID lessonId = UUID.randomUUID();
            String sectionId = "section-1";
            Map<String, Object> payload = Map.of(
                    "lessonId", lessonId.toString(),
                    "sectionId", sectionId,
                    "durationSeconds", 300,
                    "fromSecond", 10,
                    "toSecond", 60,
                    "lastPosition", 55.0
            );
            SyncOperation op = new SyncOperation("videoProgress", "UPDATE", "/api/v3/video", payload);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.accepted()).isEqualTo(1);
            assertThat(result.rejected()).isZero();
            verify(videoProgressUseCase).trackSegments(
                    eq(STUDENT_ID), eq(lessonId), eq(sectionId),
                    eq(300), eq(10), eq(60), eq(55.0));
        }

        @Test
        @DisplayName("Should reject video progress with missing lessonId")
        void shouldRejectMissingLessonId() {
            Map<String, Object> payload = Map.of("sectionId", "section-1");
            SyncOperation op = new SyncOperation("videoProgress", "UPDATE", "/api/v3/video", payload);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.rejected()).isEqualTo(1);
            assertThat(result.conflicts()).hasSize(1);
            verifyNoInteractions(videoProgressUseCase);
        }

        @Test
        @DisplayName("Should reject video progress with null payload")
        void shouldRejectNullPayload() {
            SyncOperation op = new SyncOperation("videoProgress", "UPDATE", "/api/v3/video", null);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.rejected()).isEqualTo(1);
        }
    }

    // ─── pushChanges - progress (lesson) ─────────────────────────────

    @Nested
    @DisplayName("pushChanges - lessonProgress")
    class PushLessonProgressTests {

        private final UUID LESSON_ID = UUID.randomUUID();
        private final UUID ENROLLMENT_ID = UUID.randomUUID();

        @Test
        @DisplayName("Should route lesson progress with enrollmentId directly")
        void shouldRouteWithEnrollmentId() {
            Map<String, Object> payload = new HashMap<>();
            payload.put("lessonId", LESSON_ID.toString());
            payload.put("enrollmentId", ENROLLMENT_ID.toString());
            payload.put("status", "COMPLETED");
            SyncOperation op = new SyncOperation("progress", "UPDATE", "/api/progress", payload);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.accepted()).isEqualTo(1);
            ArgumentCaptor<UpdateLessonProgressCommand> captor =
                    ArgumentCaptor.forClass(UpdateLessonProgressCommand.class);
            verify(lessonProgressUseCase).execute(captor.capture());

            UpdateLessonProgressCommand cmd = captor.getValue();
            assertThat(cmd.enrollmentId()).isEqualTo(ENROLLMENT_ID);
            assertThat(cmd.lessonId()).isEqualTo(LESSON_ID);
            assertThat(cmd.status()).isEqualTo("COMPLETED");
        }

        @Test
        @DisplayName("Should find enrollment by courseId when enrollmentId missing")
        void shouldFindByCourseId() {
            UUID courseId = UUID.randomUUID();
            Enrollment enrollment = mock(Enrollment.class);
            when(enrollment.getId()).thenReturn(ENROLLMENT_ID);
            when(enrollmentRepository.findByStudentIdAndCourseId(STUDENT_ID, courseId))
                    .thenReturn(Optional.of(enrollment));

            Map<String, Object> payload = new HashMap<>();
            payload.put("lessonId", LESSON_ID.toString());
            payload.put("courseId", courseId.toString());
            SyncOperation op = new SyncOperation("progress", "UPDATE", "/api/progress", payload);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.accepted()).isEqualTo(1);
            verify(lessonProgressUseCase).execute(any(UpdateLessonProgressCommand.class));
        }

        @Test
        @DisplayName("Should scan active enrollments when no enrollmentId or courseId")
        void shouldScanActiveEnrollments() {
            Enrollment enrollment = mock(Enrollment.class);
            when(enrollment.getId()).thenReturn(ENROLLMENT_ID);
            when(enrollment.getProgress()).thenReturn(Map.of(LESSON_ID.toString(),
                    mock(com.example.lms.learning_delivery.domain.model.Enrollment.LessonProgress.class)));
            when(enrollmentRepository.findActiveByStudentId(STUDENT_ID))
                    .thenReturn(List.of(enrollment));

            Map<String, Object> payload = new HashMap<>();
            payload.put("lessonId", LESSON_ID.toString());
            SyncOperation op = new SyncOperation("progress", "UPDATE", "/api/progress", payload);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.accepted()).isEqualTo(1);
        }

        @Test
        @DisplayName("Should reject when no enrollment found")
        void shouldRejectWhenNoEnrollment() {
            when(enrollmentRepository.findActiveByStudentId(STUDENT_ID))
                    .thenReturn(List.of());

            Map<String, Object> payload = new HashMap<>();
            payload.put("lessonId", LESSON_ID.toString());
            SyncOperation op = new SyncOperation("progress", "UPDATE", "/api/progress", payload);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.rejected()).isEqualTo(1);
            assertThat(result.conflicts()).hasSize(1);
            assertThat(result.conflicts().get(0).message()).contains("Không tìm thấy đăng ký học");
        }

        @Test
        @DisplayName("Should default status to COMPLETED when not provided")
        void shouldDefaultStatusToCompleted() {
            Map<String, Object> payload = new HashMap<>();
            payload.put("lessonId", LESSON_ID.toString());
            payload.put("enrollmentId", ENROLLMENT_ID.toString());
            SyncOperation op = new SyncOperation("progress", "UPDATE", "/api/progress", payload);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            useCase.pushChanges(USER_ID, request);

            ArgumentCaptor<UpdateLessonProgressCommand> captor =
                    ArgumentCaptor.forClass(UpdateLessonProgressCommand.class);
            verify(lessonProgressUseCase).execute(captor.capture());
            assertThat(captor.getValue().status()).isEqualTo("COMPLETED");
        }
    }

    // ─── pushChanges - submission ────────────────────────────────────

    @Nested
    @DisplayName("pushChanges - submission")
    class PushSubmissionTests {

        @Test
        @DisplayName("Should accept submission (deferred to endpoint replay)")
        void shouldAcceptSubmission() {
            Map<String, Object> payload = Map.of("assignmentId", UUID.randomUUID().toString());
            SyncOperation op = new SyncOperation("submission", "CREATE",
                    "/api/v3/assignments/123/submissions", payload);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.accepted()).isEqualTo(1);
            assertThat(result.rejected()).isZero();
        }

        @Test
        @DisplayName("Should reject submission with null payload")
        void shouldRejectNullPayload() {
            SyncOperation op = new SyncOperation("submission", "CREATE",
                    "/api/v3/assignments/123/submissions", null);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.rejected()).isEqualTo(1);
        }
    }

    // ─── pushChanges - quizAttempt ───────────────────────────────────

    @Nested
    @DisplayName("pushChanges - quizAttempt")
    class PushQuizAttemptTests {

        /** Build a minimal QuizAttempt domain object for stubbing startAttempt(). */
        private QuizAttempt buildAttempt(UUID id, UUID quizId) {
            return QuizAttempt.builder()
                    .id(id)
                    .quizId(quizId)
                    .studentId(STUDENT_ID)
                    .status(QuizAttempt.AttemptStatus.IN_PROGRESS)
                    .build();
        }

        @Test
        @DisplayName("Should route offline quiz attempt to QuizAttemptUseCase (start + submit)")
        void shouldRouteToQuizAttemptUseCase() {
            UUID quizId = UUID.randomUUID();
            UUID serverAttemptId = UUID.randomUUID();
            UUID questionId = UUID.randomUUID();
            // Offline payload: Map answers (no pre-existing server attemptId)
            Map<String, Object> payload = Map.of(
                    "quizId", quizId.toString(),
                    "answers", Map.of(questionId.toString(), "A")
            );
            when(quizAttemptUseCase.startAttempt(eq(quizId), eq(STUDENT_ID)))
                    .thenReturn(buildAttempt(serverAttemptId, quizId));

            SyncOperation op = new SyncOperation("quizAttempt", "CREATE", "/api/quiz", payload);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.accepted()).isEqualTo(1);
            verify(quizAttemptUseCase).startAttempt(eq(quizId), eq(STUDENT_ID));
            verify(quizAttemptUseCase).submitAttempt(eq(serverAttemptId), anyList());
        }

        @Test
        @DisplayName("Should reject quiz attempt with missing quizId")
        void shouldRejectMissingQuizId() {
            // No quizId in payload — cannot start attempt
            Map<String, Object> payload = Map.of(
                    "answers", Map.of(UUID.randomUUID().toString(), "A")
            );
            SyncOperation op = new SyncOperation("quizAttempt", "CREATE", "/api/quiz", payload);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.rejected()).isEqualTo(1);
            assertThat(result.conflicts().get(0).message()).contains("Thiếu quizId");
        }

        @Test
        @DisplayName("Should reject quiz attempt with empty answers map")
        void shouldRejectEmptyAnswers() {
            UUID quizId = UUID.randomUUID();
            UUID serverAttemptId = UUID.randomUUID();
            Map<String, Object> payload = Map.of(
                    "quizId", quizId.toString(),
                    "answers", Map.of()          // empty map → no AttemptAnswers built
            );
            when(quizAttemptUseCase.startAttempt(eq(quizId), eq(STUDENT_ID)))
                    .thenReturn(buildAttempt(serverAttemptId, quizId));

            SyncOperation op = new SyncOperation("quizAttempt", "CREATE", "/api/quiz", payload);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.rejected()).isEqualTo(1);
            assertThat(result.conflicts().get(0).message()).contains("trống");
        }

        @Test
        @DisplayName("Should handle submitAttempt exception gracefully")
        void shouldHandleException() {
            UUID quizId = UUID.randomUUID();
            UUID serverAttemptId = UUID.randomUUID();
            Map<String, Object> payload = Map.of(
                    "quizId", quizId.toString(),
                    "answers", Map.of(UUID.randomUUID().toString(), "B")
            );
            when(quizAttemptUseCase.startAttempt(eq(quizId), eq(STUDENT_ID)))
                    .thenReturn(buildAttempt(serverAttemptId, quizId));
            doThrow(new IllegalStateException("Grading failed"))
                    .when(quizAttemptUseCase).submitAttempt(eq(serverAttemptId), anyList());

            SyncOperation op = new SyncOperation("quizAttempt", "CREATE", "/api/quiz", payload);
            SyncPushRequest request = new SyncPushRequest(List.of(op));

            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.rejected()).isEqualTo(1);
            assertThat(result.conflicts()).hasSize(1);
        }
    }

    // ─── pushChanges - Mixed batch ───────────────────────────────────

    @Nested
    @DisplayName("pushChanges - Mixed batch")
    class MixedBatchTests {

        @Test
        @DisplayName("Should process mixed batch and count accepted/rejected correctly")
        void shouldProcessMixedBatch() {
            UUID lessonId = UUID.randomUUID();
            // Valid video progress
            SyncOperation videoOp = new SyncOperation("videoProgress", "UPDATE", "/api/video",
                    Map.of("lessonId", lessonId.toString(), "sectionId", "s1",
                            "durationSeconds", 100, "fromSecond", 0, "toSecond", 50, "lastPosition", 45.0));
            // Invalid progress (no enrollment)
            SyncOperation progressOp = new SyncOperation("progress", "UPDATE", "/api/progress",
                    new HashMap<>(Map.of("lessonId", lessonId.toString())));
            // Valid submission
            SyncOperation submissionOp = new SyncOperation("submission", "CREATE", "/api/submissions",
                    Map.of("assignmentId", UUID.randomUUID().toString()));

            when(enrollmentRepository.findActiveByStudentId(STUDENT_ID)).thenReturn(List.of());

            SyncPushRequest request = new SyncPushRequest(List.of(videoOp, progressOp, submissionOp));
            SyncResponse.PushResult result = useCase.pushChanges(USER_ID, request);

            assertThat(result.accepted()).isEqualTo(2); // video + submission
            assertThat(result.rejected()).isEqualTo(1); // progress (no enrollment)
            assertThat(result.conflicts()).hasSize(1);
        }
    }

    // ─── pullChanges ─────────────────────────────────────────────────

    @Nested
    @DisplayName("pullChanges")
    class PullChangesTests {

        @Test
        @DisplayName("Should return empty when no video progress changes")
        void shouldReturnEmptyWhenNoChanges() {
            when(videoProgressRepository.findByStudentIdAndUpdatedAtAfter(eq(STUDENT_ID), any(Instant.class)))
                    .thenReturn(List.of());

            SyncResponse.PullResult result = useCase.pullChanges(USER_ID, Instant.now().minusSeconds(3600));

            assertThat(result.changes()).isEmpty();
            assertThat(result.serverTimestamp()).isNotNull();
        }

        @Test
        @DisplayName("Should return video progress changes since timestamp via batch query")
        void shouldReturnVideoProgressChanges() {
            UUID lessonId = UUID.randomUUID();
            Instant since = Instant.now().minusSeconds(3600);
            Instant updatedAt = Instant.now().minusSeconds(100);

            VideoProgress vp = mock(VideoProgress.class);
            when(vp.getUpdatedAt()).thenReturn(updatedAt);
            when(vp.getSectionId()).thenReturn("section-1");
            when(vp.getLessonId()).thenReturn(lessonId);
            when(vp.getProgressPercent()).thenReturn(75.0);
            when(vp.getWatchedSeconds()).thenReturn(180);
            when(vp.isCompleted()).thenReturn(false);
            when(vp.getLastPosition()).thenReturn(45.5);
            when(videoProgressRepository.findByStudentIdAndUpdatedAtAfter(STUDENT_ID, since))
                    .thenReturn(List.of(vp));

            SyncResponse.PullResult result = useCase.pullChanges(USER_ID, since);

            assertThat(result.changes()).hasSize(1);
            Map<String, Object> change = result.changes().get(0);
            assertThat(change.get("entityType")).isEqualTo("videoProgress");
            assertThat(change.get("sectionId")).isEqualTo("section-1");
            assertThat(change.get("progressPercent")).isEqualTo(75.0);
            assertThat(change.get("completed")).isEqualTo(false);
        }

        @Test
        @DisplayName("Should use Instant.EPOCH when since is null")
        void shouldUseEpochWhenSinceNull() {
            when(videoProgressRepository.findByStudentIdAndUpdatedAtAfter(eq(STUDENT_ID), eq(Instant.EPOCH)))
                    .thenReturn(List.of());

            SyncResponse.PullResult result = useCase.pullChanges(USER_ID, null);

            assertThat(result.changes()).isEmpty();
            verify(videoProgressRepository).findByStudentIdAndUpdatedAtAfter(STUDENT_ID, Instant.EPOCH);
        }
    }

    // ─── getStatus ───────────────────────────────────────────────────

    @Nested
    @DisplayName("getStatus")
    class GetStatusTests {

        @Test
        @DisplayName("Should return healthy status")
        void shouldReturnHealthyStatus() {
            SyncResponse.Status status = useCase.getStatus(USER_ID);

            assertThat(status.healthy()).isTrue();
            assertThat(status.serverTimestamp()).isNotNull();
        }
    }
}
