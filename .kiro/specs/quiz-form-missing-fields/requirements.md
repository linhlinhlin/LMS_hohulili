# Requirements Document

## Introduction

The quiz creation form in the section editor is missing critical input fields for quiz configuration. When a teacher selects "Quiz" as the lesson type, they should be able to configure quiz parameters (time limit, passing score, max attempts) directly in the creation form, but currently only an informational message is displayed without any input fields.

## Glossary

- **Section Editor**: The component where teachers manage lesson content within a course section
- **Quiz Creation Form**: The form displayed when creating a new quiz lesson
- **Quiz Configuration**: Settings that define quiz behavior including time limit, passing score, and maximum attempts
- **Lesson Type**: The type of content being created (LECTURE, ASSIGNMENT, or QUIZ)

## Requirements

### Requirement 1

**User Story:** As a teacher, I want to configure quiz settings when creating a quiz, so that I can set appropriate time limits, passing scores, and attempt limits without needing a separate configuration step.

#### Acceptance Criteria

1. WHEN a teacher selects "QUIZ" as the lesson type in the creation form, THEN the system SHALL display input fields for quiz time limit, passing score, and maximum attempts
2. WHEN the quiz configuration fields are displayed, THEN the system SHALL provide default values (30 minutes for time limit, 60% for passing score, 1 for max attempts)
3. WHEN a teacher enters quiz configuration values, THEN the system SHALL validate that time limit is a positive number, passing score is between 0-100, and max attempts is a positive integer
4. WHEN a teacher submits the quiz creation form with valid configuration, THEN the system SHALL create the quiz with the specified settings
5. WHEN the quiz configuration section is displayed, THEN the system SHALL maintain the informational message explaining the next steps after quiz creation

### Requirement 2

**User Story:** As a teacher, I want clear visual distinction between quiz configuration and other lesson types, so that I understand what settings are specific to quizzes.

#### Acceptance Criteria

1. WHEN quiz configuration fields are displayed, THEN the system SHALL use a distinct visual style (purple theme) to differentiate from assignment (blue) and lecture (default) sections
2. WHEN displaying quiz input fields, THEN the system SHALL include appropriate labels and placeholders for each field
3. WHEN quiz configuration is shown, THEN the system SHALL display icons next to each field to improve visual clarity
4. WHEN the form layout renders, THEN the system SHALL organize quiz fields in a logical grid layout for optimal space usage

### Requirement 3

**User Story:** As a teacher, I want the quiz creation button to be enabled only when required fields are filled, so that I don't accidentally create incomplete quizzes.

#### Acceptance Criteria

1. WHEN a teacher is creating a quiz, THEN the system SHALL require both title and quiz configuration fields to be valid before enabling the submit button
2. WHEN quiz configuration fields have validation errors, THEN the system SHALL display appropriate error messages
3. WHEN all required quiz fields are valid, THEN the system SHALL enable the "Tạo bài trắc nghiệm" button
4. WHEN the submit button is disabled, THEN the system SHALL apply visual styling to indicate the disabled state
