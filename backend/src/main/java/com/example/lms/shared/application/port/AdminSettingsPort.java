package com.example.lms.shared.application.port;

import java.util.Map;
import java.util.Optional;

/**
 * Application port for admin settings persistence.
 * Use case depends on this interface; infrastructure implements it.
 */
public interface AdminSettingsPort {

    /**
     * Load all settings as key-value map.
     */
    Map<String, String> loadAll();

    /**
     * Load a single setting by key.
     */
    Optional<String> load(String key);

    /**
     * Save a setting (upsert).
     */
    void save(String key, String jsonValue);
}
