package com.example.lms.repository;

import com.example.lms.entity.ChatSession;
import com.example.lms.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository cho ChatSession entity.
 * Chuẩn bị sẵn cho tích hợp AI Chatbot Backend Proxy.
 */
@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {

    /**
     * Tìm tất cả sessions của user (không bị xóa), sắp xếp theo thời gian mới nhất
     */
    Page<ChatSession> findByUserAndIsDeletedFalseOrderByUpdatedAtDesc(User user, Pageable pageable);

    /**
     * Tìm session theo ID và user (đảm bảo ownership)
     */
    Optional<ChatSession> findByIdAndUserAndIsDeletedFalse(UUID id, User user);

    /**
     * Đếm số sessions của user
     */
    long countByUserAndIsDeletedFalse(User user);

    /**
     * Tìm session với messages (fetch join để tránh N+1)
     */
    @Query("SELECT s FROM ChatSession s LEFT JOIN FETCH s.messages WHERE s.id = :id AND s.user = :user AND s.isDeleted = false")
    Optional<ChatSession> findByIdWithMessages(@Param("id") UUID id, @Param("user") User user);

    /**
     * Tìm sessions theo context (course)
     */
    Page<ChatSession> findByUserAndContextCourseIdAndIsDeletedFalseOrderByUpdatedAtDesc(
        User user, UUID courseId, Pageable pageable
    );
}
