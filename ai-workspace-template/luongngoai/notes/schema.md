# Database Schema Export

This document contains the full schema of the Supabase project "lms".

## Tables

### assignment_allocation_students
**Type:** BASE TABLE

#### Columns
- `assigned_at`: timestamp with time zone, NOT NULL
- `custom_deadline`: timestamp without time zone, NULL
- `allocation_id`: uuid, NOT NULL
- `student_id`: uuid, NOT NULL
- `note`: text, NULL

#### Primary Key
- `allocation_id`, `student_id`

#### Foreign Keys
- `student_id` -> `users`.`id`
- `allocation_id` -> `assignment_allocations`.`id`

#### Indexes
- `assignment_allocation_students_pkey`: CREATE UNIQUE INDEX assignment_allocation_students_pkey ON public.assignment_allocation_students USING btree (allocation_id, student_id)

### assignment_allocations
**Type:** BASE TABLE

#### Columns
- `is_individual`: boolean, NULL
- `created_at`: timestamp with time zone, NOT NULL
- `updated_at`: timestamp with time zone, NULL
- `assignment_id`: uuid, NOT NULL
- `created_by`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `distribution_type`: character varying, NOT NULL
- `allocated_at`: timestamp with time zone, NULL
- `allocator_id`: uuid, NULL
- `class_id`: uuid, NULL
- `due_date`: timestamp with time zone, NULL
- `is_active`: boolean, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `assignment_id` -> `assignments`.`id`
- `created_by` -> `users`.`id`

#### Indexes
- `assignment_allocations_pkey`: CREATE UNIQUE INDEX assignment_allocations_pkey ON public.assignment_allocations USING btree (id)

### assignment_attachments
**Type:** BASE TABLE

#### Columns
- `upload_order`: integer, NULL
- `created_at`: timestamp with time zone, NOT NULL
- `file_size`: bigint, NULL
- `assignment_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `mime_type`: character varying, NULL
- `file_url`: character varying, NOT NULL
- `file_id`: character varying, NOT NULL
- `file_name`: character varying, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
- `assignment_id` -> `assignments`.`id`

#### Indexes
- `assignment_attachments_pkey`: CREATE UNIQUE INDEX assignment_attachments_pkey ON public.assignment_attachments USING btree (id)

### assignment_rubrics
**Type:** BASE TABLE

#### Columns
- `max_points`: numeric, NOT NULL
- `order_index`: integer, NULL
- `weight`: numeric, NULL
- `created_at`: timestamp with time zone, NOT NULL
- `assignment_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `criteria_name`: character varying, NOT NULL
- `description`: text, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `assignment_id` -> `assignments`.`id`

#### Indexes
- `assignment_rubrics_pkey`: CREATE UNIQUE INDEX assignment_rubrics_pkey ON public.assignment_rubrics USING btree (id)

### assignment_submissions
**Type:** BASE TABLE

#### Columns
- `score`: numeric, NULL
- `created_at`: timestamp without time zone, NOT NULL
- `graded_at`: timestamp without time zone, NULL
- `submitted_at`: timestamp without time zone, NULL
- `updated_at`: timestamp without time zone, NOT NULL
- `assignment_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `student_id`: uuid, NOT NULL
- `attachment_url`: character varying, NULL
- `content`: text, NULL
- `feedback`: text, NULL
- `status`: character varying, NULL
- `attempt_number`: integer, NULL
- `file_url`: character varying, NULL
- `graded_by_id`: uuid, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `student_id` -> `users`.`id`
- `assignment_id` -> `assignments`.`id`
- `graded_by_id` -> `users`.`id`

#### Indexes
- `assignment_submissions_pkey`: CREATE UNIQUE INDEX assignment_submissions_pkey ON public.assignment_submissions USING btree (id)
- `idx_assignment_submissions_student_id`: CREATE INDEX idx_assignment_submissions_student_id ON public.assignment_submissions USING btree (student_id)

### assignments
**Type:** BASE TABLE

#### Columns
- `max_score`: numeric, NULL
- `created_at`: timestamp with time zone, NOT NULL
- `due_date`: timestamp without time zone, NULL
- `updated_at`: timestamp with time zone, NULL
- `course_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `assignment_type`: character varying, NULL
- `description`: text, NOT NULL
- `instructions`: text, NULL
- `status`: character varying, NULL
- `title`: character varying, NOT NULL
- `assignment_config`: jsonb, NULL
- `allow_late_submission`: boolean, NULL
- `lesson_id`: uuid, NULL
- `max_attempts`: integer, NULL
- `passing_score`: integer, NULL
- `type`: character varying, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
- `course_id` -> `courses`.`id`
- `lesson_id` -> `lessons`.`id`

#### Indexes
- `assignments_pkey`: CREATE UNIQUE INDEX assignments_pkey ON public.assignments USING btree (id)
- `idx_assignments_course_id`: CREATE INDEX idx_assignments_course_id ON public.assignments USING btree (course_id)

### categories
**Type:** BASE TABLE

#### Columns
- `id`: uuid, NOT NULL
- `code`: character varying, NOT NULL
- `name`: character varying, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
None

#### Indexes
- `categories_code_key`: CREATE UNIQUE INDEX categories_code_key ON public.categories USING btree (code)
- `categories_pkey`: CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id)

### chapter_authoring
**Type:** BASE TABLE

#### Columns
- `is_published`: boolean, NULL
- `order_index`: integer, NULL
- `created_at`: timestamp with time zone, NULL
- `course_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `title`: character varying, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
- `course_id` -> `course_authoring`.`id`

#### Indexes
- `chapter_authoring_pkey`: CREATE UNIQUE INDEX chapter_authoring_pkey ON public.chapter_authoring USING btree (id)

### chapters
**Type:** BASE TABLE

#### Columns
- `order_index`: integer, NOT NULL
- `created_at`: timestamp with time zone, NOT NULL
- `updated_at`: timestamp with time zone, NULL
- `course_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `description`: character varying, NULL
- `title`: character varying, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
- `course_id` -> `courses`.`id`

#### Indexes
- `chapters_pkey`: CREATE UNIQUE INDEX chapters_pkey ON public.chapters USING btree (id)
- `idx_chapters_course_id`: CREATE INDEX idx_chapters_course_id ON public.chapters USING btree (course_id)

### chat_messages
**Type:** BASE TABLE

#### Columns
- `processing_time`: double precision, NULL
- `created_at`: timestamp with time zone, NOT NULL
- `id`: uuid, NOT NULL
- `session_id`: uuid, NOT NULL
- `ai_model`: character varying, NULL
- `content`: text, NOT NULL
- `sender_type`: character varying, NOT NULL
- `sources`: text, NULL
- `status`: character varying, NOT NULL
- `confidence_score`: double precision, NULL
- `document_ids_used`: text, NULL
- `query_type`: character varying, NULL
- `topics_accessed`: text, NULL
- `role`: character varying, NOT NULL
- `tokens_used`: integer, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `session_id` -> `chat_sessions`.`id`

#### Indexes
- `chat_messages_pkey`: CREATE UNIQUE INDEX chat_messages_pkey ON public.chat_messages USING btree (id)
- `idx_chat_message_created`: CREATE INDEX idx_chat_message_created ON public.chat_messages USING btree (created_at)
- `idx_chat_message_query_type`: CREATE INDEX idx_chat_message_query_type ON public.chat_messages USING btree (query_type)
- `idx_chat_message_session`: CREATE INDEX idx_chat_message_session ON public.chat_messages USING btree (session_id)

### chat_sessions
**Type:** BASE TABLE

#### Columns
- `is_deleted`: boolean, NULL
- `created_at`: timestamp with time zone, NOT NULL
- `updated_at`: timestamp with time zone, NOT NULL
- `context_course_id`: uuid, NULL
- `context_lesson_id`: uuid, NULL
- `id`: uuid, NOT NULL
- `user_id`: uuid, NOT NULL
- `title`: character varying, NULL
- `context_id`: uuid, NULL
- `context_type`: character varying, NULL
- `is_archived`: boolean, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `user_id` -> `users`.`id`

#### Indexes
- `chat_sessions_pkey`: CREATE UNIQUE INDEX chat_sessions_pkey ON public.chat_sessions USING btree (id)
- `idx_chat_session_created`: CREATE INDEX idx_chat_session_created ON public.chat_sessions USING btree (created_at)
- `idx_chat_session_user`: CREATE INDEX idx_chat_session_user ON public.chat_sessions USING btree (user_id)

### class_courses
**Type:** BASE TABLE

#### Columns
- `id`: uuid, NOT NULL, DEFAULT: gen_random_uuid()
- `class_id`: uuid, NOT NULL
- `course_id`: uuid, NOT NULL
- `added_by`: uuid, NULL
- `order_index`: integer, NULL, DEFAULT: 0
- `is_required`: boolean, NULL, DEFAULT: true
- `created_at`: timestamp without time zone, NULL, DEFAULT: now()

#### Primary Key
- `id`

#### Foreign Keys
- `added_by` -> `users`.`id`
- `class_id` -> `learning_classes`.`id`
- `course_id` -> `courses`.`id`

#### Indexes
- `class_courses_pkey`: CREATE UNIQUE INDEX class_courses_pkey ON public.class_courses USING btree (id)
- `idx_class_courses_class_id`: CREATE INDEX idx_class_courses_class_id ON public.class_courses USING btree (class_id)
- `idx_class_courses_course_id`: CREATE INDEX idx_class_courses_course_id ON public.class_courses USING btree (course_id)
- `ukml1t82rxdi7x5cp8oaopfkcit`: CREATE UNIQUE INDEX ukml1t82rxdi7x5cp8oaopfkcit ON public.class_courses USING btree (class_id, course_id)
- `uq_class_course`: CREATE UNIQUE INDEX uq_class_course ON public.class_courses USING btree (class_id, course_id)

### conversations
**Type:** BASE TABLE

#### Columns
- `is_archived_by_student`: boolean, NULL
- `is_archived_by_teacher`: boolean, NULL
- `created_at`: timestamp without time zone, NOT NULL
- `updated_at`: timestamp without time zone, NOT NULL
- `id`: uuid, NOT NULL
- `student_id`: uuid, NOT NULL
- `teacher_id`: uuid, NOT NULL
- `is_archived_1`: boolean, NULL
- `is_archived_2`: boolean, NULL
- `last_message_at`: timestamp with time zone, NULL
- `last_message_preview`: character varying, NULL
- `participant1_id`: uuid, NOT NULL
- `participant2_id`: uuid, NOT NULL
- `unread_count_1`: integer, NULL
- `unread_count_2`: integer, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `teacher_id` -> `users`.`id`
- `student_id` -> `users`.`id`

#### Indexes
- `conversations_pkey`: CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id)
- `conversations_teacher_id_student_id_key`: CREATE UNIQUE INDEX conversations_teacher_id_student_id_key ON public.conversations USING btree (teacher_id, student_id)
- `idx_conversation_student`: CREATE INDEX idx_conversation_student ON public.conversations USING btree (student_id)
- `idx_conversation_teacher`: CREATE INDEX idx_conversation_teacher ON public.conversations USING btree (teacher_id)
- `idx_conversation_updated`: CREATE INDEX idx_conversation_updated ON public.conversations USING btree (updated_at)
- `uk48r86ndwaqvoo23skguoojto5`: CREATE UNIQUE INDEX uk48r86ndwaqvoo23skguoojto5 ON public.conversations USING btree (teacher_id, student_id)

### course_authoring
**Type:** BASE TABLE

#### Columns
- `category_id`: integer, NULL
- `price`: numeric, NULL
- `created_at`: timestamp with time zone, NULL
- `updated_at`: timestamp with time zone, NULL
- `id`: uuid, NOT NULL
- `owner_id`: uuid, NOT NULL
- `prerequisite_course_id`: uuid, NULL
- `code`: character varying, NOT NULL
- `description`: text, NULL
- `price_type`: character varying, NULL
- `slug`: character varying, NULL
- `status`: character varying, NOT NULL
- `thumbnail_url`: character varying, NULL
- `title`: character varying, NOT NULL
- `unlock_mode`: character varying, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `owner_id` -> `users`.`id`

#### Indexes
- `course_authoring_code_key`: CREATE UNIQUE INDEX course_authoring_code_key ON public.course_authoring USING btree (code)
- `course_authoring_pkey`: CREATE UNIQUE INDEX course_authoring_pkey ON public.course_authoring USING btree (id)
- `course_authoring_slug_key`: CREATE UNIQUE INDEX course_authoring_slug_key ON public.course_authoring USING btree (slug)

### course_enrollments
**Type:** BASE TABLE

#### Columns
- `course_id`: uuid, NOT NULL
- `student_id`: uuid, NOT NULL

#### Primary Key
- `course_id`, `student_id`

#### Foreign Keys
- `student_id` -> `users`.`id`
- `course_id` -> `courses`.`id`

#### Indexes
- `course_enrollments_pkey`: CREATE UNIQUE INDEX course_enrollments_pkey ON public.course_enrollments USING btree (course_id, student_id)

### course_tags
**Type:** BASE TABLE

#### Columns
- `course_id`: uuid, NOT NULL
- `tag_name`: character varying, NULL

#### Primary Key
None

#### Foreign Keys
- `course_id` -> `courses`.`id`

#### Indexes
None

### course_teaching_staff
**Type:** BASE TABLE

#### Columns
- `course_id`: uuid, NOT NULL
- `staff_id`: uuid, NULL

#### Primary Key
None

#### Foreign Keys
- `course_id` -> `courses`.`id`

#### Indexes
None

### course_versions
**Type:** BASE TABLE

#### Columns
- `version_number`: integer, NOT NULL
- `published_at`: timestamp with time zone, NULL
- `course_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `snapshot_content`: jsonb, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
None

#### Indexes
- `course_versions_pkey`: CREATE UNIQUE INDEX course_versions_pkey ON public.course_versions USING btree (id)

### courses
**Type:** BASE TABLE

#### Columns
- `credits`: integer, NULL
- `price`: numeric, NULL
- `sale_price`: numeric, NULL
- `created_at`: timestamp with time zone, NOT NULL
- `reviewed_at`: timestamp with time zone, NULL
- `updated_at`: timestamp with time zone, NULL
- `category_id`: uuid, NULL
- `id`: uuid, NOT NULL
- `instructor_id`: uuid, NULL
- `reviewed_by_id`: uuid, NULL
- `teacher_id`: uuid, NOT NULL
- `code`: character varying, NOT NULL
- `description`: text, NULL
- `intro_video_url`: character varying, NULL
- `price_type`: character varying, NULL
- `review_comment`: text, NULL
- `status`: character varying, NOT NULL
- `title`: character varying, NOT NULL
- `visibility`: character varying, NULL
- `benefits`: text, NULL
- `course_information`: text, NULL
- `welcome_message`: text, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `reviewed_by_id` -> `users`.`id`
- `category_id` -> `categories`.`id`
- `teacher_id` -> `users`.`id`

#### Indexes
- `courses_code_key`: CREATE UNIQUE INDEX courses_code_key ON public.courses USING btree (code)
- `courses_pkey`: CREATE UNIQUE INDEX courses_pkey ON public.courses USING btree (id)
- `idx_courses_category_id`: CREATE INDEX idx_courses_category_id ON public.courses USING btree (category_id)
- `idx_courses_status`: CREATE INDEX idx_courses_status ON public.courses USING btree (status)
- `idx_courses_teacher_id`: CREATE INDEX idx_courses_teacher_id ON public.courses USING btree (teacher_id)

### enrollments
**Type:** BASE TABLE

#### Columns
- `id`: uuid, NOT NULL, DEFAULT: gen_random_uuid()
- `student_id`: uuid, NOT NULL
- `class_id`: uuid, NOT NULL
- `status`: character varying, NULL, DEFAULT: 'ACTIVE'
- `progress`: jsonb, NULL
- `completion_percent`: integer, NULL, DEFAULT: 0
- `completed_at`: timestamp without time zone, NULL
- `enrolled_at`: timestamp without time zone, NULL, DEFAULT: now()
- `joined_at`: timestamp without time zone, NULL
- `last_accessed_at`: timestamp without time zone, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `student_id` -> `users`.`id`
- `class_id` -> `learning_classes`.`id`

#### Indexes
- `enrollments_pkey`: CREATE UNIQUE INDEX enrollments_pkey ON public.enrollments USING btree (id)
- `idx_enrollments_class_id`: CREATE INDEX idx_enrollments_class_id ON public.enrollments USING btree (class_id)
- `idx_enrollments_student_id`: CREATE INDEX idx_enrollments_student_id ON public.enrollments USING btree (student_id)
- `uk82aln7vxjltduw8lw278we3j0`: CREATE UNIQUE INDEX uk82aln7vxjltduw8lw278we3j0 ON public.enrollments USING btree (student_id, class_id)
- `uq_student_class`: CREATE UNIQUE INDEX uq_student_class ON public.enrollments USING btree (student_id, class_id)

### file_attachments
**Type:** BASE TABLE

#### Columns
- `id`: uuid, NOT NULL
- `content_type`: character varying, NOT NULL
- `deleted_at`: timestamp with time zone, NULL
- `entity_id`: uuid, NULL
- `entity_type`: character varying, NULL
- `file_category`: character varying, NOT NULL
- `file_size`: bigint, NOT NULL
- `original_filename`: character varying, NOT NULL
- `status`: character varying, NOT NULL
- `storage_path`: character varying, NOT NULL
- `stored_filename`: character varying, NOT NULL
- `updated_at`: timestamp with time zone, NULL
- `uploaded_at`: timestamp with time zone, NOT NULL
- `uploaded_by`: uuid, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
None

#### Indexes
- `file_attachments_pkey`: CREATE UNIQUE INDEX file_attachments_pkey ON public.file_attachments USING btree (id)
- `uke263ul6jl1hxvweuixy753uvj`: CREATE UNIQUE INDEX uke263ul6jl1hxvweuixy753uvj ON public.file_attachments USING btree (stored_filename)

### flyway_schema_history
**Type:** BASE TABLE

#### Columns
- `installed_rank`: integer, NOT NULL
- `version`: character varying, NULL
- `description`: character varying, NOT NULL
- `type`: character varying, NOT NULL
- `script`: character varying, NOT NULL
- `checksum`: integer, NULL
- `installed_by`: character varying, NOT NULL
- `installed_on`: timestamp without time zone, NOT NULL, DEFAULT: now()
- `execution_time`: integer, NOT NULL
- `success`: boolean, NOT NULL

#### Primary Key
- `installed_rank`

#### Foreign Keys
None

#### Indexes
- `flyway_schema_history_pk`: CREATE UNIQUE INDEX flyway_schema_history_pk ON public.flyway_schema_history USING btree (installed_rank)
- `flyway_schema_history_s_idx`: CREATE INDEX flyway_schema_history_s_idx ON public.flyway_schema_history USING btree (success)

### learning_classes
**Type:** BASE TABLE

#### Columns
- `id`: uuid, NOT NULL, DEFAULT: gen_random_uuid()
- `teacher_id`: uuid, NULL
- `name`: character varying, NOT NULL
- `code`: character varying, NULL
- `description`: text, NULL
- `schedule_type`: character varying, NULL, DEFAULT: 'CUSTOM'
- `semester`: character varying, NULL
- `max_students`: integer, NULL, DEFAULT: 9999
- `status`: character varying, NULL, DEFAULT: 'OPEN'
- `start_date`: timestamp without time zone, NULL
- `end_date`: timestamp without time zone, NULL
- `created_at`: timestamp without time zone, NULL, DEFAULT: now()
- `updated_at`: timestamp without time zone, NULL
- `course_version_id`: uuid, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `teacher_id` -> `users`.`id`

#### Indexes
- `idx_learning_classes_status`: CREATE INDEX idx_learning_classes_status ON public.learning_classes USING btree (status)
- `learning_classes_code_key`: CREATE UNIQUE INDEX learning_classes_code_key ON public.learning_classes USING btree (code)
- `learning_classes_pkey`: CREATE UNIQUE INDEX learning_classes_pkey ON public.learning_classes USING btree (id)

### learning_enrollments
**Type:** BASE TABLE

#### Columns
- `completion_percent`: integer, NULL
- `completed_at`: timestamp with time zone, NULL
- `joined_at`: timestamp with time zone, NULL
- `last_accessed_at`: timestamp with time zone, NULL
- `class_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `student_id`: uuid, NOT NULL
- `status`: character varying, NOT NULL
- `progress`: jsonb, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `student_id` -> `users`.`id`

#### Indexes
- `learning_enrollments_pkey`: CREATE UNIQUE INDEX learning_enrollments_pkey ON public.learning_enrollments USING btree (id)

### lesson_assignments
**Type:** BASE TABLE

#### Columns
- `created_at`: timestamp with time zone, NULL
- `assignment_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `lesson_id`: uuid, NOT NULL
- `order_index`: integer, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `lesson_id` -> `lessons`.`id`
- `assignment_id` -> `assignments`.`id`

#### Indexes
- `lesson_assignments_assignment_id_key`: CREATE UNIQUE INDEX lesson_assignments_assignment_id_key ON public.lesson_assignments USING btree (assignment_id)
- `lesson_assignments_lesson_id_assignment_id_key`: CREATE UNIQUE INDEX lesson_assignments_lesson_id_assignment_id_key ON public.lesson_assignments USING btree (lesson_id, assignment_id)
- `lesson_assignments_lesson_id_key`: CREATE UNIQUE INDEX lesson_assignments_lesson_id_key ON public.lesson_assignments USING btree (lesson_id)
- `lesson_assignments_pkey`: CREATE UNIQUE INDEX lesson_assignments_pkey ON public.lesson_assignments USING btree (id)
- `ukmukcqoiijjg73n2fucp3csxfh`: CREATE UNIQUE INDEX ukmukcqoiijjg73n2fucp3csxfh ON public.lesson_assignments USING btree (lesson_id, assignment_id)

### lesson_attachments
**Type:** BASE TABLE

#### Columns
- `display_order`: integer, NOT NULL
- `file_size`: bigint, NOT NULL
- `uploaded_at`: timestamp with time zone, NOT NULL
- `id`: uuid, NOT NULL
- `lesson_id`: uuid, NOT NULL
- `uploaded_by`: uuid, NULL
- `content_type`: character varying, NOT NULL
- `file_name`: character varying, NOT NULL
- `file_type`: character varying, NOT NULL
- `file_url`: character varying, NOT NULL
- `original_file_name`: character varying, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
- `uploaded_by` -> `users`.`id`
- `lesson_id` -> `lessons`.`id`

#### Indexes
- `lesson_attachments_pkey`: CREATE UNIQUE INDEX lesson_attachments_pkey ON public.lesson_attachments USING btree (id)

### lesson_authoring
**Type:** BASE TABLE

#### Columns
- `duration_seconds`: integer, NULL
- `is_required`: boolean, NULL
- `min_quiz_score`: integer, NULL
- `min_watch_percent`: integer, NULL
- `order_index`: integer, NULL
- `created_at`: timestamp with time zone, NULL
- `chapter_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `content_html`: text, NULL
- `content_url`: text, NULL
- `title`: character varying, NOT NULL
- `type`: character varying, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
- `chapter_id` -> `chapter_authoring`.`id`

#### Indexes
- `lesson_authoring_pkey`: CREATE UNIQUE INDEX lesson_authoring_pkey ON public.lesson_authoring USING btree (id)

### lessons
**Type:** BASE TABLE

#### Columns
- `order_index`: integer, NOT NULL
- `created_at`: timestamp with time zone, NOT NULL
- `updated_at`: timestamp with time zone, NULL
- `chapter_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `description`: text, NULL
- `lesson_type`: character varying, NULL
- `title`: character varying, NOT NULL
- `content`: text, NULL
- `duration_minutes`: integer, NULL
- `video_url`: character varying, NULL
- `is_preview`: boolean, NULL
- `is_required`: boolean, NULL
- `is_free`: boolean, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `chapter_id` -> `chapters`.`id`

#### Indexes
- `idx_lessons_chapter_id`: CREATE INDEX idx_lessons_chapter_id ON public.lessons USING btree (chapter_id)
- `lessons_pkey`: CREATE UNIQUE INDEX lessons_pkey ON public.lessons USING btree (id)

### messages
**Type:** BASE TABLE

#### Columns
- `is_read`: boolean, NULL
- `created_at`: timestamp without time zone, NOT NULL
- `assignment_id`: uuid, NULL
- `conversation_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `sender_id`: uuid, NOT NULL
- `content`: text, NOT NULL
- `read_at`: timestamp with time zone, NULL
- `sent_at`: timestamp with time zone, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `conversation_id` -> `conversations`.`id`
- `assignment_id` -> `assignments`.`id`
- `sender_id` -> `users`.`id`

#### Indexes
- `idx_message_conversation`: CREATE INDEX idx_message_conversation ON public.messages USING btree (conversation_id)
- `idx_message_created`: CREATE INDEX idx_message_created ON public.messages USING btree (created_at)
- `idx_message_sender`: CREATE INDEX idx_message_sender ON public.messages USING btree (sender_id)
- `messages_pkey`: CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id)

### outbox_messages
**Type:** BASE TABLE

#### Columns
- `id`: uuid, NOT NULL
- `aggregate_id`: uuid, NOT NULL
- `aggregate_type`: character varying, NOT NULL
- `attempts`: integer, NULL
- `created_at`: timestamp with time zone, NULL
- `event_type`: character varying, NOT NULL
- `last_error`: text, NULL
- `next_attempt_at`: timestamp with time zone, NULL
- `payload`: jsonb, NOT NULL
- `processed_at`: timestamp with time zone, NULL
- `status`: character varying, NULL

#### Primary Key
- `id`

#### Foreign Keys
None

#### Indexes
- `idx_outbox_status`: CREATE INDEX idx_outbox_status ON public.outbox_messages USING btree (status, next_attempt_at)
- `outbox_messages_pkey`: CREATE UNIQUE INDEX outbox_messages_pkey ON public.outbox_messages USING btree (id)

### packages
**Type:** BASE TABLE

#### Columns
- `capacity`: integer, NULL
- `created_at`: timestamp with time zone, NOT NULL
- `updated_at`: timestamp with time zone, NOT NULL
- `id`: uuid, NOT NULL
- `owner_id`: uuid, NOT NULL
- `visibility`: character varying, NOT NULL
- `subject`: character varying, NULL
- `description`: text, NULL
- `name`: character varying, NOT NULL
- `duration_days`: integer, NULL
- `is_active`: boolean, NULL
- `price`: numeric, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `owner_id` -> `users`.`id`

#### Indexes
- `packages_pkey`: CREATE UNIQUE INDEX packages_pkey ON public.packages USING btree (id)

### question_options
**Type:** BASE TABLE

#### Columns
- `display_order`: integer, NOT NULL
- `option_key`: character varying, NOT NULL
- `id`: uuid, NOT NULL
- `question_id`: uuid, NOT NULL
- `content`: text, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
- `question_id` -> `questions`.`id`

#### Indexes
- `question_options_pkey`: CREATE UNIQUE INDEX question_options_pkey ON public.question_options USING btree (id)

### questions
**Type:** BASE TABLE

#### Columns
- `correct_rate`: numeric, NULL
- `usage_count`: integer, NOT NULL
- `created_at`: timestamp with time zone, NOT NULL
- `updated_at`: timestamp with time zone, NULL
- `course_id`: uuid, NULL
- `created_by`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `package_id`: uuid, NULL
- `content`: text, NOT NULL
- `correct_option`: character varying, NOT NULL
- `difficulty`: character varying, NOT NULL
- `status`: character varying, NOT NULL
- `tags`: text, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `package_id` -> `packages`.`id`
- `created_by` -> `users`.`id`
- `course_id` -> `courses`.`id`

#### Indexes
- `questions_pkey`: CREATE UNIQUE INDEX questions_pkey ON public.questions USING btree (id)

### quiz_assignments
**Type:** BASE TABLE

#### Columns
- `assigned_at`: timestamp with time zone, NOT NULL
- `completed_at`: timestamp with time zone, NULL
- `created_at`: timestamp with time zone, NOT NULL
- `due_date`: timestamp with time zone, NULL
- `updated_at`: timestamp with time zone, NULL
- `assigned_by`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `quiz_id`: uuid, NOT NULL
- `student_id`: uuid, NOT NULL
- `status`: character varying, NOT NULL
- `class_id`: uuid, NULL
- `course_id`: uuid, NULL
- `is_active`: boolean, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `assigned_by` -> `users`.`id`
- `student_id` -> `users`.`id`
- `quiz_id` -> `quizzes`.`id`

#### Indexes
- `quiz_assignments_pkey`: CREATE UNIQUE INDEX quiz_assignments_pkey ON public.quiz_assignments USING btree (id)

### quiz_attempt_items
**Type:** BASE TABLE

#### Columns
- `is_correct`: boolean, NULL
- `time_spent_seconds`: bigint, NULL
- `attempt_id`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `question_id`: uuid, NOT NULL
- `selected_option`: character varying, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `attempt_id` -> `quiz_attempts`.`id`
- `question_id` -> `questions`.`id`

#### Indexes
- `quiz_attempt_items_pkey`: CREATE UNIQUE INDEX quiz_attempt_items_pkey ON public.quiz_attempt_items USING btree (id)

### quiz_attempts
**Type:** BASE TABLE

#### Columns
- `correct_answers`: integer, NOT NULL
- `is_passed`: boolean, NULL
- `score`: double precision, NULL
- `total_questions`: integer, NOT NULL
- `created_at`: timestamp with time zone, NOT NULL
- `end_time`: timestamp with time zone, NULL
- `start_time`: timestamp with time zone, NOT NULL
- `time_spent_seconds`: bigint, NULL
- `updated_at`: timestamp with time zone, NULL
- `assignment_id`: uuid, NULL
- `id`: uuid, NOT NULL
- `quiz_id`: uuid, NOT NULL
- `student_id`: uuid, NOT NULL
- `option_orders`: text, NULL
- `question_order`: text, NULL
- `status`: character varying, NOT NULL
- `answers`: jsonb, NULL
- `max_score`: double precision, NULL
- `started_at`: timestamp with time zone, NULL
- `submitted_at`: timestamp with time zone, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `quiz_id` -> `quizzes`.`id`
- `student_id` -> `users`.`id`
- `assignment_id` -> `quiz_assignments`.`id`

#### Indexes
- `idx_quiz_attempts_quiz_id`: CREATE INDEX idx_quiz_attempts_quiz_id ON public.quiz_attempts USING btree (quiz_id)
- `idx_quiz_attempts_student_id`: CREATE INDEX idx_quiz_attempts_student_id ON public.quiz_attempts USING btree (student_id)
- `quiz_attempts_pkey`: CREATE UNIQUE INDEX quiz_attempts_pkey ON public.quiz_attempts USING btree (id)

### quiz_questions
**Type:** BASE TABLE

#### Columns
- `display_order`: integer, NOT NULL
- `created_at`: timestamp with time zone, NOT NULL
- `id`: uuid, NOT NULL
- `question_id`: uuid, NOT NULL
- `quiz_id`: uuid, NOT NULL
- `correct_answer`: character varying, NULL
- `explanation`: text, NULL
- `options`: jsonb, NULL
- `order_index`: integer, NULL
- `points`: integer, NULL
- `question`: text, NOT NULL
- `type`: character varying, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
- `quiz_id` -> `quizzes`.`id`
- `question_id` -> `questions`.`id`

#### Indexes
- `quiz_questions_pkey`: CREATE UNIQUE INDEX quiz_questions_pkey ON public.quiz_questions USING btree (id)
- `quiz_questions_quiz_id_question_id_key`: CREATE UNIQUE INDEX quiz_questions_quiz_id_question_id_key ON public.quiz_questions USING btree (quiz_id, question_id)
- `ukdgya47t7wpun3gxwobcjkqjf`: CREATE UNIQUE INDEX ukdgya47t7wpun3gxwobcjkqjf ON public.quiz_questions USING btree (quiz_id, question_id)

### quizzes
**Type:** BASE TABLE

#### Columns
- `max_attempts`: integer, NOT NULL
- `passing_score`: integer, NOT NULL
- `random_count`: integer, NULL
- `show_correct_answers`: boolean, NOT NULL
- `show_results_immediately`: boolean, NOT NULL
- `shuffle_options`: boolean, NOT NULL
- `shuffle_questions`: boolean, NOT NULL
- `time_limit_minutes`: integer, NULL
- `created_at`: timestamp with time zone, NOT NULL
- `end_date`: timestamp with time zone, NULL
- `published_at`: timestamp with time zone, NULL
- `start_date`: timestamp with time zone, NULL
- `updated_at`: timestamp with time zone, NULL
- `course_id`: uuid, NULL
- `created_by`: uuid, NOT NULL
- `id`: uuid, NOT NULL
- `section_id`: uuid, NULL
- `description`: text, NULL
- `question_ids`: text, NULL
- `random_difficulties`: text, NULL
- `random_tags`: text, NULL
- `title`: character varying, NULL
- `type`: character varying, NOT NULL
- `lesson_id`: uuid, NULL
- `status`: character varying, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
- `section_id` -> `sections`.`id`
- `created_by` -> `users`.`id`
- `course_id` -> `courses`.`id`
- `lesson_id` -> `lessons`.`id`

#### Indexes
- `quizzes_pkey`: CREATE UNIQUE INDEX quizzes_pkey ON public.quizzes USING btree (id)
- `quizzes_section_id_key`: CREATE UNIQUE INDEX quizzes_section_id_key ON public.quizzes USING btree (section_id)
- `ukqe2s9lw7k56o4dn543g5j4dw8`: CREATE UNIQUE INDEX ukqe2s9lw7k56o4dn543g5j4dw8 ON public.quizzes USING btree (lesson_id)

### refresh_tokens
**Type:** BASE TABLE

#### Columns
- `id`: uuid, NOT NULL
- `created_at`: timestamp with time zone, NULL
- `device_info`: character varying, NULL
- `expiry_date`: timestamp with time zone, NOT NULL
- `ip_address`: character varying, NULL
- `replaced_by_token`: character varying, NULL
- `revoked`: boolean, NOT NULL
- `token`: character varying, NOT NULL
- `user_id`: uuid, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
- `user_id` -> `users`.`id`

#### Indexes
- `idx_refresh_tokens_expiry_date`: CREATE INDEX idx_refresh_tokens_expiry_date ON public.refresh_tokens USING btree (expiry_date)
- `idx_refresh_tokens_revoked`: CREATE INDEX idx_refresh_tokens_revoked ON public.refresh_tokens USING btree (revoked)
- `idx_refresh_tokens_token`: CREATE INDEX idx_refresh_tokens_token ON public.refresh_tokens USING btree (token)
- `idx_refresh_tokens_user_id`: CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id)
- `idx_refresh_tokens_user_valid`: CREATE INDEX idx_refresh_tokens_user_valid ON public.refresh_tokens USING btree (user_id, revoked, expiry_date)
- `idx_refresh_tokens_valid_session`: CREATE INDEX idx_refresh_tokens_valid_session ON public.refresh_tokens USING btree (revoked, expiry_date)
- `refresh_tokens_pkey`: CREATE UNIQUE INDEX refresh_tokens_pkey ON public.refresh_tokens USING btree (id)
- `ukghpmfn23vmxfu3spu3lfg4r2d`: CREATE UNIQUE INDEX ukghpmfn23vmxfu3spu3lfg4r2d ON public.refresh_tokens USING btree (token)

### sections
**Type:** BASE TABLE

#### Columns
- `duration`: integer, NULL
- `is_required`: boolean, NOT NULL
- `order_index`: integer, NOT NULL
- `created_at`: timestamp with time zone, NOT NULL
- `updated_at`: timestamp with time zone, NULL
- `id`: uuid, NOT NULL
- `lesson_id`: uuid, NOT NULL
- `video_url`: character varying, NULL
- `content`: text, NULL
- `title`: character varying, NOT NULL
- `type`: character varying, NOT NULL
- `description`: character varying, NULL
- `file_url`: character varying, NULL
- `duration_seconds`: integer, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `lesson_id` -> `lessons`.`id`

#### Indexes
- `sections_pkey`: CREATE UNIQUE INDEX sections_pkey ON public.sections USING btree (id)

### stu_lesson_progress
**Type:** BASE TABLE

#### Columns
- `time_spent_minutes`: integer, NULL
- `completed_at`: timestamp with time zone, NULL
- `created_at`: timestamp with time zone, NOT NULL
- `started_at`: timestamp with time zone, NULL
- `updated_at`: timestamp with time zone, NULL
- `id`: uuid, NOT NULL
- `lesson_id`: uuid, NOT NULL
- `student_id`: uuid, NOT NULL
- `status`: character varying, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
- `lesson_id` -> `lessons`.`id`
- `student_id` -> `users`.`id`

#### Indexes
- `stu_lesson_progress_pkey`: CREATE UNIQUE INDEX stu_lesson_progress_pkey ON public.stu_lesson_progress USING btree (id)
- `stu_lesson_progress_student_id_lesson_id_key`: CREATE UNIQUE INDEX stu_lesson_progress_student_id_lesson_id_key ON public.stu_lesson_progress USING btree (student_id, lesson_id)
- `uk3utp66qbnlr7c3cvhi7hkr2y7`: CREATE UNIQUE INDEX uk3utp66qbnlr7c3cvhi7hkr2y7 ON public.stu_lesson_progress USING btree (student_id, lesson_id)

### student_lesson_progress
**Type:** BASE TABLE

#### Columns
- `id`: uuid, NOT NULL
- `completed_at`: timestamp with time zone, NULL
- `completion_percent`: integer, NULL
- `enrollment_id`: uuid, NULL
- `last_accessed_at`: timestamp with time zone, NULL
- `lesson_id`: uuid, NOT NULL
- `started_at`: timestamp with time zone, NULL
- `status`: character varying, NOT NULL
- `student_id`: uuid, NOT NULL
- `watch_time_seconds`: integer, NULL

#### Primary Key
- `id`

#### Foreign Keys
None

#### Indexes
- `idx_student_lesson_progress_lesson_id`: CREATE INDEX idx_student_lesson_progress_lesson_id ON public.student_lesson_progress USING btree (lesson_id)
- `idx_student_lesson_progress_student_id`: CREATE INDEX idx_student_lesson_progress_student_id ON public.student_lesson_progress USING btree (student_id)
- `student_lesson_progress_pkey`: CREATE UNIQUE INDEX student_lesson_progress_pkey ON public.student_lesson_progress USING btree (id)

### submissions
**Type:** BASE TABLE

#### Columns
- `score`: numeric, NULL
- `graded_at`: timestamp with time zone, NULL
- `submitted_at`: timestamp with time zone, NOT NULL
- `assignment_id`: uuid, NOT NULL
- `graded_by`: uuid, NULL
- `id`: uuid, NOT NULL
- `student_id`: uuid, NOT NULL
- `file_url`: character varying, NULL
- `content`: text, NOT NULL
- `feedback`: text, NULL

#### Primary Key
- `id`

#### Foreign Keys
- `student_id` -> `users`.`id`
- `assignment_id` -> `assignments`.`id`
- `graded_by` -> `users`.`id`

#### Indexes
- `submissions_assignment_id_student_id_key`: CREATE UNIQUE INDEX submissions_assignment_id_student_id_key ON public.submissions USING btree (assignment_id, student_id)
- `submissions_pkey`: CREATE UNIQUE INDEX submissions_pkey ON public.submissions USING btree (id)
- `ukeiqoen8c565i0gq79ritryilw`: CREATE UNIQUE INDEX ukeiqoen8c565i0gq79ritryilw ON public.submissions USING btree (assignment_id, student_id)

### users
**Type:** BASE TABLE

#### Columns
- `enabled`: boolean, NOT NULL
- `created_at`: timestamp with time zone, NOT NULL
- `updated_at`: timestamp with time zone, NULL
- `id`: uuid, NOT NULL
- `username`: character varying, NOT NULL
- `email`: character varying, NOT NULL
- `full_name`: character varying, NOT NULL
- `password`: character varying, NOT NULL
- `role`: character varying, NOT NULL

#### Primary Key
- `id`

#### Foreign Keys
None

#### Indexes
- `idx_users_email`: CREATE INDEX idx_users_email ON public.users USING btree (email)
- `idx_users_email_lower`: CREATE INDEX idx_users_email_lower ON public.users USING btree (lower((email)::text))
- `idx_users_fullname_lower`: CREATE INDEX idx_users_fullname_lower ON public.users USING btree (lower((full_name)::text))
- `idx_users_role`: CREATE INDEX idx_users_role ON public.users USING btree (role)
- `idx_users_role_email_lower`: CREATE INDEX idx_users_role_email_lower ON public.users USING btree (role, lower((email)::text))
- `idx_users_role_fullname_lower`: CREATE INDEX idx_users_role_fullname_lower ON public.users USING btree (role, lower((full_name)::text))
- `users_email_key`: CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)
- `users_pkey`: CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)
- `users_username_key`: CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username)

## Views

None

## Extensions

None