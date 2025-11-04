package com.example.lms.service;

import com.example.lms.entity.Assignment;
import com.example.lms.entity.Lesson;
import com.example.lms.entity.LessonAssignment;
import com.example.lms.entity.User;
import com.example.lms.repository.AssignmentRepository;
import com.example.lms.repository.LessonAssignmentRepository;
import com.example.lms.repository.LessonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class LessonAssignmentService {

    private final LessonAssignmentRepository lessonAssignmentRepository;
    private final LessonRepository lessonRepository;
    private final AssignmentRepository assignmentRepository;

    /**
     * Link an assignment to a lesson
     */
    public LessonAssignment linkAssignmentToLesson(UUID lessonId, UUID assignmentId, User currentUser) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài học với ID: " + lessonId));
        
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập với ID: " + assignmentId));

        // Permission check: only the teacher who owns the course can link assignments
        if (!lesson.getSection().getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền liên kết bài tập với bài học này");
        }

        // Check if already linked
        if (lessonAssignmentRepository.findByLessonIdAndAssignmentId(lessonId, assignmentId).isPresent()) {
            throw new RuntimeException("Bài tập đã được liên kết với bài học này");
        }

        LessonAssignment lessonAssignment = LessonAssignment.builder()
                .lesson(lesson)
                .assignment(assignment)
                .build();

        return lessonAssignmentRepository.save(lessonAssignment);
    }

    /**
     * Unlink an assignment from a lesson
     */
    public void unlinkAssignmentFromLesson(UUID lessonId, UUID assignmentId, User currentUser) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài học với ID: " + lessonId));

        // Permission check
        if (!lesson.getSection().getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền hủy liên kết bài tập với bài học này");
        }

        lessonAssignmentRepository.deleteByLessonIdAndAssignmentId(lessonId, assignmentId);
    }

    /**
     * Get assignments linked to a lesson
     */
    public List<LessonAssignment> getAssignmentsByLesson(UUID lessonId, User currentUser) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài học với ID: " + lessonId));

        // Permission check
        if (!lesson.getSection().getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền xem danh sách bài tập của bài học này");
        }

        return lessonAssignmentRepository.findByLessonId(lessonId);
    }

    /**
     * Get lesson linked to an assignment
     */
    public LessonAssignment getLessonByAssignment(UUID assignmentId, User currentUser) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy bài tập với ID: " + assignmentId));

        List<LessonAssignment> lessonAssignments = lessonAssignmentRepository.findByAssignmentId(assignmentId);
        
        if (lessonAssignments.isEmpty()) {
            throw new RuntimeException("Bài tập chưa được liên kết với bài học nào");
        }

        // Return the first one (should be only one based on business logic)
        return lessonAssignments.get(0);
    }
}
