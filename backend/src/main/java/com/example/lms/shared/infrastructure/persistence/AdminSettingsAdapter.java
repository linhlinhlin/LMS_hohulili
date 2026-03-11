package com.example.lms.shared.infrastructure.persistence;

import com.example.lms.shared.application.port.AdminSettingsPort;
import com.example.lms.shared.infrastructure.persistence.entity.AdminSettingJpaEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class AdminSettingsAdapter implements AdminSettingsPort {

    private final AdminSettingJpaRepository repository;

    @Override
    public Map<String, String> loadAll() {
        return repository.findAll().stream()
                .collect(Collectors.toMap(
                        AdminSettingJpaEntity::getSettingKey,
                        AdminSettingJpaEntity::getSettingValue));
    }

    @Override
    public Optional<String> load(String key) {
        return repository.findById(key).map(AdminSettingJpaEntity::getSettingValue);
    }

    @Override
    public void save(String key, String jsonValue) {
        AdminSettingJpaEntity entity = repository.findById(key)
                .orElse(new AdminSettingJpaEntity(key, jsonValue));
        entity.setSettingValue(jsonValue);
        entity.setUpdatedAt(Instant.now());
        repository.save(entity);
    }
}
