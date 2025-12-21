package com.example.lms.assessment.domain.event;

import com.example.lms.shared.domain.event.AbstractDomainEvent;
import com.example.lms.shared.domain.valueobject.CourseId;
import com.example.lms.shared.domain.valueobject.StudentId;

import java.util.UUID;

/**
 * Event raised when a student submits a quiz attempt.
 * Contains the calculated score and pass/fail status.
 */
public class QuizSubmittedEvent extends AbstractDomainEvent {

    private final UUID quizId;
    private final StudentId studentId;
    private final CourseId courseId;
    private final double score;
    private final boolean passed;

    public QuizSubmittedEvent(UUID attemptId, UUID quizId, StudentId studentId, 
                              CourseId courseId, double score, boolean passed) {
        super(attemptId);
        this.quizId = quizId;
        this.studentId = studentId;
        this.courseId = courseId;
        this.score = score;
        this.passed = passed;
    }

    public UUID getAttemptId() {
        return getAggregateId();
    }

    public UUID getQuizId() {
        return quizId;
    }

    public StudentId getStudentId() {
        return studentId;
    }

    public CourseId getCourseId() {
        return courseId;
    }

    public double getScore() {
        return score;
    }

    public boolean isPassed() {
        return passed;
    }
}
