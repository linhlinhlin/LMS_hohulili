package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.infrastructure.persistence.entity.AdminSettingJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminSettingJpaRepository extends JpaRepository<AdminSettingJpaEntity, String> {
}
