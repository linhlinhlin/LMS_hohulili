package com.example.lms.learning_delivery.domain.repository;

import com.example.lms.learning_delivery.domain.model.StudentAchievement;

import java.util.List;
import java.util.UUID;

public interface StudentAchievementRepository {
    StudentAchievement save(StudentAchievement studentAchievement);
    List<StudentAchievement> findByStudentId(UUID studentId);
    boolean existsByStudentIdAndAchievementId(UUID studentId, UUID achievementId);
}
