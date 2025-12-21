package com.example.lms.ai_assistant.application.dto;

import java.util.UUID;

/**
 * Command to create a new chat session.
 */
public record CreateChatSessionCommand(
    String title,
    String contextType,   // GENERAL, COURSE, LESSON, QUIZ
    UUID contextId        // ID of the context entity (course, lesson, etc.)
) {}

