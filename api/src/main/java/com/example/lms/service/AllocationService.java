package com.example.lms.service;

import com.example.lms.entity.*;
import com.example.lms.repository.AssignmentAllocationRepository;
import com.example.lms.repository.AssignmentRepository;
import com.example.lms.repository.CourseRepository;
import com.example.lms.repository.UserRepository;
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
public class AllocationService {

    private final AssignmentAllocationRepository allocationRepository;
    private final AssignmentRepository assignmentRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    /**
     * Tạo hoặc cập nhật allocation cho bài tập
     */
    @Transactional
    public AssignmentAllocation createOrUpdateAllocation(
            UUID assignmentId,
            AssignmentAllocation.DistributionType distributionType,
            List<UUID> studentIds,
            User createdBy,
            boolean isIndividual
    ) {
        Assignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new RuntimeException("Assignment not found"));

        // Kiểm tra quyền: chỉ giáo viên của khóa học mới được giao bài
        if (!assignment.getCourse().getTeacher().getId().equals(createdBy.getId())) {
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

        // Xóa danh sách học viên cũ
        allocation.getAllocatedStudents().clear();

        // Nếu là SPECIFIC_STUDENTS, thêm danh sách học viên
        if (distributionType == AssignmentAllocation.DistributionType.SPECIFIC_STUDENTS && studentIds != null) {
            for (UUID studentId : studentIds) {
                User student = userRepository.findById(studentId)
                        .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));
                allocation.addStudent(student, null);
            }
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

        // Kết hợp và trả về danh sách assignments
        java.util.Set<Assignment> assignments = new java.util.HashSet<>();
        
        allStudentsAllocations.forEach(a -> assignments.add(a.getAssignment()));
        specificAllocations.stream()
                .filter(a -> a.getAssignment().getCourse().getId().equals(courseId))
                .forEach(a -> assignments.add(a.getAssignment()));

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

        // Kiểm tra quyền
        if (!assignment.getCourse().getTeacher().getId().equals(assignedBy.getId())) {
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

        // Kiểm tra quyền
        if (!allocation.getAssignment().getCourse().getTeacher().getId().equals(removedBy.getId())) {
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

        // Kiểm tra quyền
        if (!allocation.getAssignment().getCourse().getTeacher().getId().equals(updatedBy.getId())) {
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
