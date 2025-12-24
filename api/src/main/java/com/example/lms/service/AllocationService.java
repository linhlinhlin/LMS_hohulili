package com.example.lms.service;

import com.example.lms.entity.*;
import com.example.lms.repository.AssignmentAllocationRepository;
import com.example.lms.repository.AssignmentRepository;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.UserRepository;
import com.example.lms.repository.EnrollmentRepository;
import com.example.lms.learning_delivery.domain.model.LearningClass;
import com.example.lms.util.AuthorizationHelper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Service quản lý phân phối bài tập cho học viên.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AllocationService {

    private final AssignmentAllocationRepository allocationRepository;
    private final AssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final com.example.lms.repository.LearningClassRepository classRepository;

    /**
     * Tạo hoặc cập nhật allocation cho bài tập (Overloaded for backward compatibility)
     */
    @Transactional
    public AssignmentAllocation createOrUpdateAllocation(
            UUID assignmentId,
            AssignmentAllocation.DistributionType distributionType,
            List<UUID> studentIds,
            User createdBy,
            boolean isIndividual
    ) {
        return createOrUpdateAllocation(assignmentId, distributionType, studentIds, null, createdBy, isIndividual);
    }

    /**
     * Tạo hoặc cập nhật allocation cho bài tập
     */
    @Transactional
    public AssignmentAllocation createOrUpdateAllocation(
            UUID assignmentId,
            AssignmentAllocation.DistributionType distributionType,
            List<UUID> studentIds,
            UUID classId,
            User createdBy,
            boolean isIndividual
    ) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(assignment.getCourse(), createdBy)) {
            throw new RuntimeException("Bạn không có quyền giao bài tập này");
        }

        // Tìm allocation hiện có hoặc tạo mới
        AssignmentAllocation allocation = allocationRepository.findByAssignmentId(assignmentId)
                .orElse(AssignmentAllocation.builder()
                        .assignment(assignment)
                        .createdBy(createdBy)
                        .build());

        allocation.setDistributionType(distributionType);
        allocation.setIsIndividual(isIndividual);

        // Xử lý theo từng loại distribution
        if (distributionType == AssignmentAllocation.DistributionType.CLASS && classId != null) {
            LearningClass learningClass = classRepository.findById(classId)
                    .orElseThrow(() -> new RuntimeException("Class not found: " + classId));
            allocation.setLearningClass(learningClass);
            allocation.getAllocatedStudents().clear(); // Clear individual students if switching to CLASS
        } else if (distributionType == AssignmentAllocation.DistributionType.SPECIFIC_STUDENTS && studentIds != null) {
            allocation.setLearningClass(null);
            // Xóa danh sách học viên cũ
            allocation.getAllocatedStudents().clear();
            for (UUID studentId : studentIds) {
                User student = userRepository.findById(studentId)
                        .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));
                allocation.addStudent(student, null);
            }
        } else if (distributionType == AssignmentAllocation.DistributionType.CLASS && classId == null) {
            // Safety fallback: if CLASS but no classId, revert to ALL_STUDENTS or something safe
            allocation.setDistributionType(AssignmentAllocation.DistributionType.ALL_STUDENTS);
            allocation.setLearningClass(null);
            allocation.getAllocatedStudents().clear();
        } else {
            allocation.setLearningClass(null);
            allocation.getAllocatedStudents().clear();
        }

        return allocationRepository.save(allocation);
    }

    /**
     * Lấy allocation của bài tập
     */
    public AssignmentAllocation getAllocation(UUID assignmentId) {
        return allocationRepository.findByAssignmentId(assignmentId).orElse(null);
    }

    /**
     * Kiểm tra học viên có được giao bài tập không
     */
    public boolean isStudentAllocated(UUID assignmentId, UUID studentId) {
        AssignmentAllocation allocation = allocationRepository.findByAssignmentId(assignmentId).orElse(null);
        
        if (allocation == null) {
            // Nếu không có allocation, mặc định là giao cho tất cả
            return true;
        }

        if (allocation.getDistributionType() == AssignmentAllocation.DistributionType.ALL_STUDENTS) {
            // Kiểm tra học viên có trong khóa học không
            Assignment assignment = allocation.getAssignment();
            return assignment.getCourse().getEnrolledStudents().stream()
                    .anyMatch(student -> student.getId().equals(studentId));
        }

        if (allocation.getDistributionType() == AssignmentAllocation.DistributionType.CLASS) {
            // Kiểm tra học viên có enrolled trong lớp này không
            if (allocation.getLearningClass() == null) {
                return false;
            }
            return enrollmentRepository.findByStudentIdAndLearningClassId(studentId, allocation.getLearningClass().getId()).isPresent();
        }

        // SPECIFIC_STUDENTS: kiểm tra trong danh sách
        return allocation.hasStudent(studentId);
    }

    /**
     * Lấy danh sách bài tập được giao cho học viên
     */
    public List<Assignment> getAssignmentsForStudent(UUID studentId, UUID courseId) {
        // Lấy tất cả bài tập giao cho ALL_STUDENTS trong khóa học
        List<AssignmentAllocation> allStudentsAllocations = 
                allocationRepository.findAllStudentsAllocationsByCourseId(courseId);

        // Lấy tất cả bài tập giao riêng cho học viên này
        List<AssignmentAllocation> specificAllocations = 
                allocationRepository.findByStudentId(studentId);

        // Lấy tất cả bài tập giao cho học viên thông qua các lớp học
        List<com.example.lms.learning_delivery.domain.model.Enrollment> enrollments = enrollmentRepository.findByStudentId(studentId);
        List<AssignmentAllocation> classAllocations = enrollments.stream()
                .flatMap(e -> allocationRepository.findByLearningClassId(e.getLearningClass().getId()).stream())
                .toList();

        // Kết hợp và trả về danh sách assignments được phép hiển thị (PUBLISHED)
        java.util.Set<Assignment> assignments = new java.util.HashSet<>();
        
        allStudentsAllocations.stream()
                .map(AssignmentAllocation::getAssignment)
                .filter(a -> a.getStatus() == Assignment.AssignmentStatus.PUBLISHED)
                .forEach(assignments::add);

        specificAllocations.stream()
                .filter(a -> a.getAssignment().getCourse().getId().equals(courseId))
                .map(AssignmentAllocation::getAssignment)
                .filter(a -> a.getStatus() == Assignment.AssignmentStatus.PUBLISHED)
                .forEach(assignments::add);

        classAllocations.stream()
                .filter(a -> a.getAssignment().getCourse().getId().equals(courseId))
                .map(AssignmentAllocation::getAssignment)
                .filter(a -> a.getStatus() == Assignment.AssignmentStatus.PUBLISHED)
                .forEach(assignments::add);

        return new java.util.ArrayList<>(assignments);
    }

    /**
     * Giao bài tập riêng cho một học viên (individual assignment)
     */
    @Transactional
    public AssignmentAllocation assignIndividual(
            UUID assignmentId,
            UUID studentId,
            LocalDateTime customDeadline,
            String note,
            User assignedBy
    ) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(assignment.getCourse(), assignedBy)) {
            throw new RuntimeException("Bạn không có quyền giao bài tập này");
        }

        // Tìm hoặc tạo allocation
        AssignmentAllocation allocation = allocationRepository.findByAssignmentId(assignmentId)
                .orElse(AssignmentAllocation.builder()
                        .assignment(assignment)
                        .distributionType(AssignmentAllocation.DistributionType.SPECIFIC_STUDENTS)
                        .createdBy(assignedBy)
                        .isIndividual(true)
                        .build());

        // Nếu đã là ALL_STUDENTS, chuyển sang SPECIFIC_STUDENTS
        if (allocation.getDistributionType() == AssignmentAllocation.DistributionType.ALL_STUDENTS) {
            allocation.setDistributionType(AssignmentAllocation.DistributionType.SPECIFIC_STUDENTS);
            allocation.setIsIndividual(true);
        }

        // Thêm học viên nếu chưa có
        if (!allocation.hasStudent(studentId)) {
            AssignmentAllocationStudent allocationStudent = AssignmentAllocationStudent.builder()
                    .allocation(allocation)
                    .student(student)
                    .customDeadline(customDeadline)
                    .note(note)
                    .build();
            allocation.getAllocatedStudents().add(allocationStudent);
        }

        return allocationRepository.save(allocation);
    }

    /**
     * Xóa học viên khỏi danh sách được giao
     */
    @Transactional
    public void removeStudentFromAllocation(UUID assignmentId, UUID studentId, User removedBy) {
        AssignmentAllocation allocation = allocationRepository.findByAssignmentId(assignmentId)
                .orElseThrow(() -> new RuntimeException("Allocation not found"));

        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(allocation.getAssignment().getCourse(), removedBy)) {
            throw new RuntimeException("Bạn không có quyền thực hiện thao tác này");
        }

        allocation.getAllocatedStudents().removeIf(as -> as.getStudent().getId().equals(studentId));
        allocationRepository.save(allocation);
    }

    /**
     * Cập nhật deadline riêng cho học viên
     */
    @Transactional
    public void updateStudentDeadline(
            UUID assignmentId,
            UUID studentId,
            LocalDateTime newDeadline,
            User updatedBy
    ) {
        AssignmentAllocation allocation = allocationRepository.findByAssignmentId(assignmentId)
                .orElseThrow(() -> new RuntimeException("Allocation not found"));

        // SOTA: Admin super access + Owner check
        if (!AuthorizationHelper.isOwnerOrAdmin(allocation.getAssignment().getCourse(), updatedBy)) {
            throw new RuntimeException("Bạn không có quyền thực hiện thao tác này");
        }

        allocation.getAllocatedStudents().stream()
                .filter(as -> as.getStudent().getId().equals(studentId))
                .findFirst()
                .ifPresent(as -> as.setCustomDeadline(newDeadline));

        allocationRepository.save(allocation);
    }

    /**
     * Lấy thống kê allocation (deprecated - use getAllocationStatsForAssignment instead)
     */
    public AllocationStats getAllocationStats(UUID assignmentId, int totalEnrolledStudents) {
        AssignmentAllocation allocation = allocationRepository.findByAssignmentId(assignmentId).orElse(null);

        if (allocation == null) {
            return new AllocationStats(totalEnrolledStudents, "ALL_STUDENTS", false);
        }

        int totalAllocated;
        if (allocation.getDistributionType() == AssignmentAllocation.DistributionType.ALL_STUDENTS) {
            totalAllocated = totalEnrolledStudents;
        } else {
            totalAllocated = allocation.getAllocatedStudents().size();
        }

        return new AllocationStats(
                totalAllocated,
                allocation.getDistributionType().name(),
                allocation.getIsIndividual()
        );
    }
    
    /**
     * Lấy thống kê allocation cho assignment (query trực tiếp từ DB)
     */
    public AllocationStats getAllocationStatsForAssignment(UUID assignmentId, UUID courseId) {
        AssignmentAllocation allocation = allocationRepository.findByAssignmentId(assignmentId).orElse(null);
        
        // Query số enrolled students trực tiếp từ DB
        int totalEnrolledStudents = courseRepository.countEnrolledStudents(courseId);

        if (allocation == null) {
            // Không có allocation = giao cho tất cả học viên enrolled
            return new AllocationStats(totalEnrolledStudents, "ALL_STUDENTS", false);
        }

        int totalAllocated;
        if (allocation.getDistributionType() == AssignmentAllocation.DistributionType.ALL_STUDENTS) {
            // Giao cho tất cả học viên enrolled
            totalAllocated = totalEnrolledStudents;
        } else if (allocation.getDistributionType() == AssignmentAllocation.DistributionType.CLASS) {
            // Giao cho tất cả học viên trong lớp
            if (allocation.getLearningClass() == null) {
                totalAllocated = 0;
            } else {
                totalAllocated = (int) enrollmentRepository.countByLearningClassId(allocation.getLearningClass().getId());
            }
        } else {
            // SPECIFIC_STUDENTS: lấy số học viên được chọn cụ thể
            totalAllocated = allocation.getAllocatedStudents().size();
        }

        return new AllocationStats(
                totalAllocated,
                allocation.getDistributionType().name(),
                allocation.getIsIndividual() != null ? allocation.getIsIndividual() : false
        );
    }

    public record AllocationStats(int totalAllocated, String distributionType, boolean isIndividual) {}
}
