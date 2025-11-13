package com.example.lms.service;

import com.example.lms.entity.Course;
import com.example.lms.entity.Section;
import com.example.lms.entity.User;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.SectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class SectionService {

    private final SectionRepository sectionRepository;
    private final CourseRepository courseRepository;

    public Section createSection(UUID courseId, User currentUser, com.example.lms.controller.SectionController.CreateSectionRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy khóa học với ID: " + courseId));
        
        // Check if user is the teacher of this course
        if (!course.getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền tạo section cho khóa học này");
        }

        // Check for duplicate section title within the same course
        if (sectionRepository.existsByCourseIdAndTitle(courseId, request.getTitle())) {
            throw new RuntimeException("Trong khóa học này đã có chương '" + request.getTitle() + "'");
        }

        // Approval workflow removed: allow creating sections regardless of course status

        // Set order index if not provided
        int orderIndex = request.getOrderIndex() != null ? request.getOrderIndex() :
                        sectionRepository.findMaxOrderIndexByCourse(course) + 1;

        Section section = Section.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .orderIndex(orderIndex)
                .course(course)
                .build();

        return sectionRepository.save(section);
    }

    public Section updateSection(UUID sectionId, User currentUser, com.example.lms.controller.SectionController.UpdateSectionRequest request) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy section với ID: " + sectionId));
        
        // Check if user is the teacher of this course
        if (!section.getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền chỉnh sửa section này");
        }

        // Approval workflow removed: allow editing sections regardless of course status

        if (request.getTitle() != null) {
            // Check for duplicate section title within the same course when updating
            if (!request.getTitle().equals(section.getTitle()) &&
                sectionRepository.existsByCourseIdAndTitle(section.getCourse().getId(), request.getTitle())) {
                throw new RuntimeException("Trong khóa học này đã có chương '" + request.getTitle() + "'");
            }
            section.setTitle(request.getTitle());
        }

        if (request.getDescription() != null) {
            section.setDescription(request.getDescription());
        }

        if (request.getOrderIndex() != null) {
            section.setOrderIndex(request.getOrderIndex());
        }

        return sectionRepository.save(section);
    }

    public void deleteSection(UUID sectionId, User currentUser) {
        Section section = sectionRepository.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy section với ID: " + sectionId));
        
        // Check if user is the teacher of this course
        if (!section.getCourse().getTeacher().getId().equals(currentUser.getId())) {
            throw new RuntimeException("Bạn không có quyền xóa section này");
        }

        // Approval workflow removed: allow deleting regardless of status (optional: enforce ownership only)

        sectionRepository.delete(section);
    }
}