package com.example.lms.repository;

import com.example.lms.entity.AssignmentAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AssignmentAllocationRepository extends JpaRepository<AssignmentAllocation, UUID> {

    /**
     * Tìm allocation theo assignment ID
     */
    Optional<AssignmentAllocation> findByAssignmentId(UUID assignmentId);

    /**
     * Tìm tất cả allocations của một khóa học
     */
    @Query("SELECT aa FROM AssignmentAllocation aa WHERE aa.assignment.course.id = :courseId")
    List<AssignmentAllocation> findByCourseId(@Param("courseId") UUID courseId);

    /**
     * Tìm tất cả allocations do một giáo viên tạo
     */
    List<AssignmentAllocation> findByCreatedById(UUID teacherId);

    /**
     * Kiểm tra học viên có được giao bài tập không (cho SPECIFIC_STUDENTS)
     */
    @Query("SELECT CASE WHEN COUNT(aas) > 0 THEN true ELSE false END " +
           "FROM AssignmentAllocationStudent aas " +
           "WHERE aas.allocation.assignment.id = :assignmentId AND aas.student.id = :studentId")
    boolean isStudentAllocated(@Param("assignmentId") UUID assignmentId, @Param("studentId") UUID studentId);

    /**
     * Lấy danh sách bài tập được giao cho học viên (SPECIFIC_STUDENTS)
     */
    @Query("SELECT aa FROM AssignmentAllocation aa " +
           "JOIN aa.allocatedStudents aas " +
           "WHERE aas.student.id = :studentId")
    List<AssignmentAllocation> findByStudentId(@Param("studentId") UUID studentId);

    /**
     * Lấy danh sách bài tập giao cho tất cả học viên trong khóa học
     */
    @Query("SELECT aa FROM AssignmentAllocation aa " +
           "WHERE aa.assignment.course.id = :courseId AND aa.distributionType = 'ALL_STUDENTS'")
    List<AssignmentAllocation> findAllStudentsAllocationsByCourseId(@Param("courseId") UUID courseId);

    /**
     * Tìm allocations theo class ID
     */
    List<AssignmentAllocation> findByLearningClassId(UUID classId);

    /**
     * Xóa allocation theo assignment ID
     */
    void deleteByAssignmentId(UUID assignmentId);
}
