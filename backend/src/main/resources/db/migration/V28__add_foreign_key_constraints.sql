-- V28: Add foreign key constraints for referential integrity
-- Safe: Uses IF NOT EXISTS pattern via DO blocks

-- =====================================================
-- 1. chapters → courses
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_chapters_course_id' AND table_name = 'chapters') THEN
        ALTER TABLE chapters ADD CONSTRAINT fk_chapters_course_id
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 2. lessons → chapters
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_lessons_chapter_id' AND table_name = 'lessons') THEN
        ALTER TABLE lessons ADD CONSTRAINT fk_lessons_chapter_id
            FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 3. enrollments → learning_classes
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_enrollments_class_id' AND table_name = 'enrollments') THEN
        ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_class_id
            FOREIGN KEY (class_id) REFERENCES learning_classes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 4. enrollments → users (student)
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_enrollments_student_id' AND table_name = 'enrollments') THEN
        ALTER TABLE enrollments ADD CONSTRAINT fk_enrollments_student_id
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 5. learning_classes → courses
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_learning_classes_course_id' AND table_name = 'learning_classes') THEN
        ALTER TABLE learning_classes ADD CONSTRAINT fk_learning_classes_course_id
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 6. assignments → courses
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_assignments_course_id' AND table_name = 'assignments') THEN
        ALTER TABLE assignments ADD CONSTRAINT fk_assignments_course_id
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 7. quizzes → lessons
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_quizzes_lesson_id' AND table_name = 'quizzes') THEN
        ALTER TABLE quizzes ADD CONSTRAINT fk_quizzes_lesson_id
            FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 8. questions → packages (question banks)
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_questions_package_id' AND table_name = 'questions') THEN
        ALTER TABLE questions ADD CONSTRAINT fk_questions_package_id
            FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- 9. question_options → questions
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_question_options_question_id' AND table_name = 'question_options') THEN
        ALTER TABLE question_options ADD CONSTRAINT fk_question_options_question_id
            FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 10. quiz_questions → quizzes
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_quiz_questions_quiz_id' AND table_name = 'quiz_questions') THEN
        ALTER TABLE quiz_questions ADD CONSTRAINT fk_quiz_questions_quiz_id
            FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 11. quiz_questions → questions
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_quiz_questions_question_id' AND table_name = 'quiz_questions') THEN
        ALTER TABLE quiz_questions ADD CONSTRAINT fk_quiz_questions_question_id
            FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- 12. student_lesson_progress → enrollments
-- =====================================================
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_student_progress_enrollment_id' AND table_name = 'student_lesson_progress') THEN
        ALTER TABLE student_lesson_progress ADD CONSTRAINT fk_student_progress_enrollment_id
            FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- 13. Additional missing indexes for FK columns
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_lesson_attachments_lesson_id ON lesson_attachments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_question_id ON quiz_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_student_lesson_progress_lesson_id ON student_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_course_id ON assignment_submissions(course_id);
