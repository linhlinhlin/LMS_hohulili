package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.Chapter;
import com.example.lms.entity.User;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.ChapterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ChapterService {

    private final ChapterRepository chapterRepository;
    private final CourseRepository courseRepository;

    public Chapter createChapter(UUID courseId, User currentUser, com.example.lms.controller.ChapterController.CreateChapterRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
        
        // Check if user is the teacher of this course OR is an Admin
        boolean isOwner = course.getTeacher().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == User.Role.ADMIN;
        
        if (!isOwner && !isAdmin) {
            throw new RuntimeException("Bạn không có quyền tạo chapter cho khóa học này");
        }

        // Check for duplicate chapter title within the same course
        if (chapterRepository.existsByCourseIdAndTitle(courseId, request.getTitle())) {
            throw new RuntimeException("Trong khóa học này đã có chương '" + request.getTitle() + "'");
        }

        // Set order index if not provided
        int orderIndex = request.getOrderIndex() != null ? request.getOrderIndex() :
                        chapterRepository.findMaxOrderIndexByCourse(course) + 1;

        Chapter chapter = Chapter.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .orderIndex(orderIndex)
                .course(course)
                .build();

        return chapterRepository.save(chapter);
    }

    public Chapter updateChapter(UUID chapterId, User currentUser, com.example.lms.controller.ChapterController.UpdateChapterRequest request) {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chapter với ID: " + chapterId));
        
        // Check if user is the teacher of this course OR is an Admin
        boolean isOwner = chapter.getCourse().getTeacher().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == User.Role.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa chapter này");
        }

        if (request.getTitle() != null) {
            // Check for duplicate chapter title within the same course when updating
            if (!request.getTitle().equals(chapter.getTitle()) &&
                chapterRepository.existsByCourseIdAndTitle(chapter.getCourse().getId(), request.getTitle())) {
                throw new RuntimeException("Trong khóa học này đã có chương '" + request.getTitle() + "'");
            }
            chapter.setTitle(request.getTitle());
        }

        if (request.getDescription() != null) {
            chapter.setDescription(request.getDescription());
        }

        if (request.getOrderIndex() != null) {
            chapter.setOrderIndex(request.getOrderIndex());
        }

        return chapterRepository.save(chapter);
    }

    public void deleteChapter(UUID chapterId, User currentUser) {
        Chapter chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy chapter với ID: " + chapterId));
        
        // Check if user is the teacher of this course OR is an Admin
        boolean isOwner = chapter.getCourse().getTeacher().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == User.Role.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new RuntimeException("Bạn không có quyền xóa chapter này");
        }

        chapterRepository.delete(chapter);
    }
}
