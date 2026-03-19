package com.example.lms.course_authoring.application.port;

import java.util.Optional;
import java.util.UUID;

/**
 * Application port for course publication workflows used by command-side use cases.
 */
public interface CoursePublicationPort {

    void publish(UUID courseId, UUID publishedById);

    Optional<UUID> findLatestPublicationId(UUID courseId);
}
