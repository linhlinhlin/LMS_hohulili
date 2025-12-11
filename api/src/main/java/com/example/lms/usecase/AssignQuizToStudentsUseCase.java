package com.example.lms.usecase;

import com.example.lms.dto.request.AssignQuizRequest;
import com.example.lms.dto.response.QuizAssignmentResponse;
import com.example.lms.entity.*;
import com.example.lms.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Use Case: Assign a quiz to students
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AssignQuizToStudentsUseCase {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AssignQuizToStudentsUseCase.class);

    private final QuizRepository quizRepository;
    private final QuizAssignmentRepository assignmentRepository;
    private final UserRepository userRepository;

    public List<QuizAssignmentResponse> execute(UUID quizId, AssignQuizRequest request, UUID teacherId) {
        log.info("Assigning quiz: {} to {} students by teacher: {}", quizId, request.getStudentIds().size(), teacherId);

        // 1. Load Quiz
        Quiz quiz = quizRepository.findById(quizId)
            .orElseThrow(() -> new IllegalArgumentException("Quiz not found: " + quizId));

        // 2. Validate: Quiz must be ASSIGNMENT type
        if (quiz.getType() != Quiz.QuizType.ASSIGNMENT) {
            throw new IllegalArgumentException("Only ASSIGNMENT quizzes can be assigned to students");
        }

        // 3. Validate: Teacher owns the quiz
        if (!quiz.getCreatedBy().getId().equals(teacherId)) {
            throw new SecurityException("You don't have permission to assign this quiz");
        }

        // 4. Load teacher
        User teacher = userRepository.findById(teacherId)
            .orElseThrow(() -> new IllegalArgumentException("Teacher not found: " + teacherId));

        // 5. Load students
        List<User> students = userRepository.findAllById(request.getStudentIds());

        if (students.size() != request.getStudentIds().size()) {
            throw new IllegalArgumentException("Some students not found");
        }

        // 6. Validate: All students enrolled in the course
        UUID courseId = quiz.getCourse().getId();
        boolean allEnrolled = students.stream()
            .allMatch(s -> isStudentEnrolledInCourse(s, courseId));

        if (!allEnrolled) {
            throw new IllegalArgumentException("Some students are not enrolled in the course");
        }

        // 7. Create QuizAssignment aggregates
        List<QuizAssignment> assignments = students.stream()
            .map(student -> {
                // Check if already assigned
                if (assignmentRepository.existsByQuizAndStudent(quiz, student)) {
                    throw new IllegalArgumentException(
                        "Quiz already assigned to student: " + student.getFullName()
                    );
                }

                return QuizAssignment.builder()
                    .quiz(quiz)
                    .student(student)
                    .assignedBy(teacher)
                    .assignedAt(Instant.now())
                    .dueDate(request.getDueDate())
                    .status(QuizAssignment.AssignmentStatus.ASSIGNED)
                    .build();
            })
            .collect(Collectors.toList());

        // 8. Save all assignments
        List<QuizAssignment> savedAssignments = assignmentRepository.saveAll(assignments);

        log.info("Assigned quiz: {} to {} students", quizId, savedAssignments.size());

        // 9. Return DTOs
        return savedAssignments.stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    private boolean isStudentEnrolledInCourse(User student, UUID courseId) {
        // Simple check - in real implementation, query enrollment table
        return student.getEnrolledCourses().stream()
            .anyMatch(course -> course.getId().equals(courseId));
    }

    private QuizAssignmentResponse mapToResponse(QuizAssignment assignment) {
        Double bestScore = null;
        Boolean isPassed = null;
        
        if (assignment.getBestAttempt() != null) {
            bestScore = assignment.getBestAttempt().getScore();
            isPassed = assignment.getBestAttempt().getIsPassed();
        }
        
        return QuizAssignmentResponse.builder()
            .id(assignment.getId())
            .quizId(assignment.getQuiz() != null ? assignment.getQuiz().getId() : null)
            .quizTitle(assignment.getQuiz() != null ? assignment.getQuiz().getTitle() : null)
            .questionCount(assignment.getQuiz() != null && assignment.getQuiz().getQuizQuestions() != null 
                ? assignment.getQuiz().getQuizQuestions().size() : 0)
            .studentId(assignment.getStudent() != null ? assignment.getStudent().getId() : null)
            .studentName(assignment.getStudent() != null ? assignment.getStudent().getFullName() : null)
            .studentEmail(assignment.getStudent() != null ? assignment.getStudent().getEmail() : null)
            .status(assignment.getStatus())
            .assignedAt(assignment.getAssignedAt())
            .dueDate(assignment.getDueDate())
            .completedAt(assignment.getCompletedAt())
            .attemptCount(assignment.getAttempts() != null ? assignment.getAttempts().size() : 0)
            .maxAttempts(assignment.getQuiz() != null ? assignment.getQuiz().getMaxAttempts() : null)
            .bestScore(bestScore)
            .isPassed(isPassed)
            .build();
    }
}
