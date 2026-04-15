package com.example.lms.learning_delivery.application.usecase;

import com.example.lms.identity.infrastructure.persistence.entity.UserJpaEntity;
import com.example.lms.identity.infrastructure.persistence.repository.UserJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.ClassTeacherJpaRepository;
import com.example.lms.learning_delivery.infrastructure.persistence.entity.ClassTeacherJpaEntity;
import com.example.lms.shared.exception.BusinessRuleException;
import com.example.lms.shared.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ManageClassTeachersUseCase {

    private final ClassTeacherJpaRepository classTeacherRepository;
    private final UserJpaRepository userRepository;

    public record ClassTeacherDTO(
            String id,
            String teacherId,
            String teacherName,
            String teacherEmail,
            String role,
            String createdAt
    ) {}

    @Transactional(readOnly = true)
    public List<ClassTeacherDTO> listTeachers(UUID classId) {
        var teachers = classTeacherRepository.findByClassId(classId);

        Set<UUID> teacherIds = teachers.stream()
                .map(ClassTeacherJpaEntity::getTeacherId)
                .collect(Collectors.toSet());

        Map<UUID, UserJpaEntity> userMap = userRepository.findAllById(teacherIds).stream()
                .collect(Collectors.toMap(UserJpaEntity::getId, u -> u));

        return teachers.stream().map(ct -> {
            var u = userMap.get(ct.getTeacherId());
            return new ClassTeacherDTO(
                    ct.getId().toString(),
                    ct.getTeacherId().toString(),
                    u != null ? u.getFullName() : "Unknown",
                    u != null ? u.getEmail() : "",
                    ct.getRole().name(),
                    ct.getCreatedAt() != null ? ct.getCreatedAt().toString() : null
            );
        }).toList();
    }

    @Transactional
    public String addCoTeacher(UUID classId, UUID teacherId) {
        var teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new EntityNotFoundException("User", teacherId));

        if (teacher.getRole() != UserJpaEntity.UserRole.TEACHER
                && teacher.getRole() != UserJpaEntity.UserRole.ADMIN
                && teacher.getRole() != UserJpaEntity.UserRole.ORG_ADMIN) {
            throw new BusinessRuleException("NOT_A_TEACHER",
                    "Người dùng này không có vai trò giảng viên");
        }

        if (classTeacherRepository.existsByClassIdAndTeacherId(classId, teacherId)) {
            throw new BusinessRuleException("ALREADY_ASSIGNED",
                    "Giảng viên này đã được gán vào lớp");
        }

        classTeacherRepository.save(ClassTeacherJpaEntity.builder()
                .classId(classId)
                .teacherId(teacherId)
                .role(ClassTeacherJpaEntity.TeacherRole.CO_TEACHER)
                .build());

        log.info("Added co-teacher {} to class {}", teacherId, classId);
        return teacher.getFullName();
    }

    @Transactional
    public void removeCoTeacher(UUID classId, UUID teacherId) {
        var ct = classTeacherRepository.findByClassIdAndTeacherId(classId, teacherId)
                .orElseThrow(() -> new EntityNotFoundException("ClassTeacher", teacherId));

        if (ct.getRole() == ClassTeacherJpaEntity.TeacherRole.PRIMARY) {
            throw new BusinessRuleException("CANNOT_REMOVE_PRIMARY",
                    "Không thể xóa giảng viên chính của lớp");
        }

        classTeacherRepository.deleteByClassIdAndTeacherId(classId, teacherId);
        log.info("Removed co-teacher {} from class {}", teacherId, classId);
    }
}
