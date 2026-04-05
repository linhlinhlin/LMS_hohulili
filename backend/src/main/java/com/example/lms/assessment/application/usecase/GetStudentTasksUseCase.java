package com.example.lms.assessment.application.usecase;

import com.example.lms.assessment.application.dto.StudentAssignmentResponse;
import com.example.lms.assessment.application.dto.StudentTaskResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Orchestrator use case: merges assignments + quizzes into a unified task list.
 * Composes GetStudentAssignmentsUseCase and GetStudentQuizzesUseCase.
 */
@Service
@RequiredArgsConstructor
public class GetStudentTasksUseCase {

    private final GetStudentAssignmentsUseCase assignmentsUseCase;
    private final GetStudentQuizzesUseCase quizzesUseCase;

    @Transactional(readOnly = true)
    public List<StudentTaskResponse> execute(UUID studentId) {
        // Fetch both types
        List<StudentTaskResponse> assignmentTasks = assignmentsUseCase.execute(studentId).stream()
                .map(this::mapAssignmentToTask)
                .collect(Collectors.toList());

        List<StudentTaskResponse> quizTasks = quizzesUseCase.execute(studentId);

        // Merge and sort by dueDate (nulls last)
        return Stream.concat(assignmentTasks.stream(), quizTasks.stream())
                .sorted(Comparator.comparing(StudentTaskResponse::dueDate,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());
    }

    private StudentTaskResponse mapAssignmentToTask(StudentAssignmentResponse a) {
        return new StudentTaskResponse(
                a.id(),
                "ASSIGNMENT",
                a.title(),
                a.description(),
                a.courseId(),
                a.courseName(),
                a.dueDate(),
                null, // availableFrom (assignments don't have this yet)
                null, // lockAt (assignments don't have this yet)
                a.status(),
                a.isLate(),
                a.score(),
                a.maxScore(),
                a.feedback(),
                a.submissionId(),
                a.submittedAt(),
                a.fileUrl(),
                a.fileName(),
                null, // attemptId
                null, // timeLimitMinutes
                a.maxAttempts(),
                null, // questionCount
                null, // passingScore
                null, // isPassed
                null, // attemptCount
                false // requiresPassword
        );
    }
}
