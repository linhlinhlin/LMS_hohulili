package com.example.lms.assessment.infrastructure.web;

import com.example.lms.assessment.application.dto.StudentTaskResponse;
import com.example.lms.assessment.application.usecase.GetStudentTasksUseCase;
import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.shared.infrastructure.web.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Student - Tasks", description = "Unified student task inbox (assignments + quizzes + exams + practice)")
@RestController
@RequestMapping("/api/v3/student/tasks")
@RequiredArgsConstructor
public class StudentTaskControllerV3 {

    private final GetStudentTasksUseCase getStudentTasksUseCase;

    @Operation(summary = "Danh sach viec can lam (tat ca bai tap, bai kiem tra, bai thi, luyen tap)")
    @GetMapping
    @PreAuthorize("hasRole('STUDENT')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<StudentTaskResponse>>> getMyTasks(
            @AuthenticationPrincipal UserJpaEntity user) {
        List<StudentTaskResponse> tasks = getStudentTasksUseCase.execute(user.getId());
        return ResponseEntity.ok(ApiResponse.success(tasks, "Danh sach viec can lam"));
    }
}
