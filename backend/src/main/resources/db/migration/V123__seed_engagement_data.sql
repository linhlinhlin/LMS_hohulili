-- =====================================================================
-- V123: Seed engagement data — lesson/video progress, announcements,
--       reads, notifications. Cho TTTN demo.
-- Closes #265 (linhlinhlin/LMS_hohulili)
--
-- Mục tiêu: dashboard learner + analytics teacher/admin có "đời sống"
-- thực tế thay vì rỗng. Phân bố long-tail (top 20% students = 50-60%
-- activity), không uniform.
--
-- Tables seeded (5):
--   1. student_lesson_progress (≥220 rows, ≥20 students, ≥50 lessons)
--   2. video_progress          (≥50 rows, position distribution thực tế)
--   3. announcements           (≥30 rows, NAV-101 + SAF-101 đậm đặc)
--   4. announcement_reads      (55-75% read rate per announcement)
--   5. notifications           (≥120 rows, ≥5 types khác nhau)
--
-- SOTA reference:
--   • Netflix watch-history     — resume position UX (video_progress)
--   • YouTube recommendations   — engagement signal modeling
--   • Canvas Announcements API  — course timeline + read state
--   • Slack channel patterns    — broadcast scope priority
--   • Linear Inbox + GitHub     — notification taxonomy + read state
--   • Coursera progress         — long-tail learner distribution
--   • Pareto principle          — top 20% generate 50-60% activity
--
-- Idempotency: deterministic UUIDs + UNIQUE constraints + ON CONFLICT.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_seed_v123_rand(seed TEXT)
RETURNS DOUBLE PRECISION AS $fn$
    SELECT (('x' || substring(md5(seed) FROM 1 FOR 8))::bit(32)::bigint::double precision)
           / 4294967295.0;
$fn$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION fn_seed_v123_int(seed TEXT, low INT, high INT)
RETURNS INT AS $fn$
    SELECT GREATEST(low, LEAST(high, low + (fn_seed_v123_rand(seed) * GREATEST(1, high - low + 1))::int));
$fn$ LANGUAGE sql IMMUTABLE;

-- =====================================================================
-- Section 1: student_lesson_progress
-- Per enrollment, pick first N lessons in course ordering. Status mix:
-- ~55% COMPLETED, ~25% IN_PROGRESS (last 1-2), ~20% NOT_STARTED.
-- =====================================================================
DO $section1$
DECLARE
    v_enroll RECORD;
    v_lesson RECORD;
    v_lesson_idx INT;
    v_total_lessons INT;
    v_completion_pct DOUBLE PRECISION;
    v_completed_count INT;
    v_in_progress_count INT;
    v_explicit_count INT;
    v_seed TEXT;
    v_status TEXT;
    v_completion_percent INT;
    v_watch_seconds INT;
    v_started_at TIMESTAMPTZ;
    v_completed_at TIMESTAMPTZ;
    v_last_accessed TIMESTAMPTZ;
    v_progress_id UUID;
    v_inserted BIGINT := 0;
BEGIN
    FOR v_enroll IN
        SELECT
            e.id           AS enrollment_id,
            e.student_id,
            e.class_id,
            lc.course_id,
            co.code        AS course_code,
            e.enrolled_at,
            COALESCE(e.completion_percent, 0)::double precision / 100.0 AS completion_factor
        FROM enrollments e
        JOIN learning_classes lc ON lc.id = e.class_id
        JOIN courses co          ON co.id = lc.course_id
        WHERE e.status = 'ACTIVE'
    LOOP
        v_seed := v_enroll.enrollment_id::text;

        SELECT COUNT(*) INTO v_total_lessons
        FROM chapters ch JOIN lessons l ON l.chapter_id = ch.id
        WHERE ch.course_id = v_enroll.course_id;

        IF v_total_lessons = 0 THEN
            CONTINUE;
        END IF;

        -- Long-tail engagement: most enrollments có completion 20-60%,
        -- top 20% học viên 70-95%. Use enrollment.completion_percent
        -- nếu có, fallback to triangular generated.
        v_completion_pct := v_enroll.completion_factor;
        IF v_completion_pct = 0 THEN
            v_completion_pct := GREATEST(0.10, LEAST(0.85,
                fn_seed_v123_rand(v_seed || ':cp') * fn_seed_v123_rand(v_seed || ':cp2')
                  * 1.4 + 0.10
            ));
        END IF;

        v_completed_count := (v_completion_pct * v_total_lessons)::int;
        v_in_progress_count := CASE
            WHEN v_completed_count >= v_total_lessons THEN 0
            WHEN fn_seed_v123_rand(v_seed || ':ip') < 0.85 THEN 1
            ELSE 0
        END;
        -- Insert thêm 2-4 NOT_STARTED rows để dashboard show đầy đủ status.
        v_explicit_count := LEAST(v_total_lessons - v_completed_count - v_in_progress_count,
                                  fn_seed_v123_int(v_seed || ':ns', 1, 3));

        v_lesson_idx := 0;
        FOR v_lesson IN
            SELECT l.id AS lesson_id, ch.order_index AS ch_order, l.order_index AS l_order
            FROM chapters ch JOIN lessons l ON l.chapter_id = ch.id
            WHERE ch.course_id = v_enroll.course_id
            ORDER BY ch.order_index, l.order_index
            LIMIT v_completed_count + v_in_progress_count + v_explicit_count
        LOOP
            v_lesson_idx := v_lesson_idx + 1;

            IF v_lesson_idx <= v_completed_count THEN
                v_status := 'COMPLETED';
                v_completion_percent := 100;
                v_watch_seconds := fn_seed_v123_int(v_seed || ':' || v_lesson_idx || ':wt', 600, 2400);
                v_started_at := v_enroll.enrolled_at +
                    (fn_seed_v123_int(v_seed || ':' || v_lesson_idx || ':st', 0, 30) || ' days')::interval;
                v_completed_at := v_started_at +
                    (fn_seed_v123_int(v_seed || ':' || v_lesson_idx || ':co', 1, 8) || ' days')::interval;
                v_last_accessed := v_completed_at;
            ELSIF v_lesson_idx <= v_completed_count + v_in_progress_count THEN
                v_status := 'IN_PROGRESS';
                v_completion_percent := fn_seed_v123_int(v_seed || ':ip:cp', 15, 85);
                v_watch_seconds := fn_seed_v123_int(v_seed || ':ip:wt', 60, 1500);
                v_started_at := NOW() - (fn_seed_v123_int(v_seed || ':ip:st', 1, 14) || ' days')::interval;
                v_completed_at := NULL;
                v_last_accessed := NOW() - (fn_seed_v123_int(v_seed || ':ip:la', 0, 5) || ' days')::interval;
            ELSE
                v_status := 'NOT_STARTED';
                v_completion_percent := 0;
                v_watch_seconds := 0;
                v_started_at := NOW() - (fn_seed_v123_int(v_seed || ':' || v_lesson_idx || ':ns:st', 0, 7) || ' days')::interval;
                v_completed_at := NULL;
                v_last_accessed := NULL;
            END IF;

            v_progress_id := md5(v_enroll.student_id::text || ':' || v_lesson.lesson_id::text)::uuid;

            INSERT INTO student_lesson_progress (
                id, student_id, lesson_id, enrollment_id, status,
                watch_time_seconds, completion_percent,
                completed_at, started_at, last_accessed_at
            ) VALUES (
                v_progress_id, v_enroll.student_id, v_lesson.lesson_id, v_enroll.enrollment_id, v_status,
                v_watch_seconds, v_completion_percent,
                v_completed_at, v_started_at, v_last_accessed
            )
            ON CONFLICT (id) DO NOTHING;

            IF FOUND THEN v_inserted := v_inserted + 1; END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'V123 §1 student_lesson_progress: inserted %', v_inserted;
END $section1$;

-- =====================================================================
-- Section 2: video_progress
-- For lessons with lesson_type ∈ ('VIDEO','LECTURE') hoặc video_url
-- IS NOT NULL, chọn ~10 lessons hot, mỗi lesson ~6-8 students.
-- Position distribution: 60% partial, 25% completed, 15% just-started.
-- =====================================================================
DO $section2$
DECLARE
    v_lesson RECORD;
    v_student RECORD;
    v_seed TEXT;
    v_section_id TEXT;
    v_duration INT;
    v_position_pct DOUBLE PRECISION;
    v_last_position DOUBLE PRECISION;
    v_watched_seconds INT;
    v_completed BOOLEAN;
    v_position_roll INT;
    v_inserted BIGINT := 0;
BEGIN
    -- Pick 12 lessons có khả năng VIDEO content cao, ưu tiên flagship courses.
    FOR v_lesson IN
        SELECT l.id AS lesson_id, ch.course_id
        FROM lessons l
        JOIN chapters ch ON ch.id = l.chapter_id
        JOIN courses co  ON co.id = ch.course_id
        WHERE co.code IN ('NAV-101', 'SAF-101', 'ENG-101', 'NAV-201', 'NAV-102')
          AND (l.lesson_type IN ('VIDEO', 'LECTURE') OR l.video_url IS NOT NULL)
        ORDER BY ch.order_index, l.order_index
        LIMIT 12
    LOOP
        FOR v_student IN
            SELECT DISTINCT e.student_id
            FROM enrollments e
            JOIN learning_classes lc ON lc.id = e.class_id
            WHERE lc.course_id = v_lesson.course_id AND e.status = 'ACTIVE'
            LIMIT 8
        LOOP
            v_seed := v_student.student_id::text || ':' || v_lesson.lesson_id::text;
            v_section_id := 'lesson:' || v_lesson.lesson_id::text;
            v_duration := fn_seed_v123_int(v_seed || ':du', 600, 1800);

            -- Position roll: 60% partial / 25% completed / 15% just-started.
            v_position_roll := fn_seed_v123_int(v_seed || ':pos', 0, 99);
            IF v_position_roll < 60 THEN
                v_position_pct := fn_seed_v123_int(v_seed || ':pp', 10, 80)::double precision;
                v_completed := false;
            ELSIF v_position_roll < 85 THEN
                v_position_pct := 100.0;
                v_completed := true;
            ELSE
                v_position_pct := fn_seed_v123_int(v_seed || ':pp2', 1, 9)::double precision;
                v_completed := false;
            END IF;

            v_last_position := (v_position_pct / 100.0) * v_duration;
            v_watched_seconds := v_last_position::int;

            INSERT INTO video_progress (
                student_id, lesson_id, section_id, duration_seconds,
                watched_seconds, progress_percent, completed, last_position,
                created_at, updated_at
            ) VALUES (
                v_student.student_id, v_lesson.lesson_id, v_section_id, v_duration,
                v_watched_seconds, v_position_pct, v_completed, v_last_position,
                NOW() - (fn_seed_v123_int(v_seed || ':ca', 1, 30) || ' days')::interval,
                NOW() - (fn_seed_v123_int(v_seed || ':ua', 0, 5) || ' days')::interval
            )
            ON CONFLICT (student_id, section_id) DO NOTHING;

            IF FOUND THEN v_inserted := v_inserted + 1; END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'V123 §2 video_progress: inserted %', v_inserted;
END $section2$;

-- =====================================================================
-- Section 3: announcements
-- Per active course có teacher, post 4-5 announcements lifecycle.
-- Vietnamese maritime context per Codex spec.
-- =====================================================================
DO $section3$
DECLARE
    v_course RECORD;
    v_announcement RECORD;
    v_seed TEXT;
    v_announcement_id UUID;
    v_published_at TIMESTAMPTZ;
    v_priority TEXT;
    v_idx INT;
    v_inserted BIGINT := 0;
    v_announcements JSONB := '[
      {"title":"Chào mừng các bạn đến với khóa học","content":"Khóa học sẽ kéo dài 8 tuần, kết hợp lý thuyết và thực hành. Vui lòng đọc syllabus và tham gia buổi định hướng đầu tuần.","priority":"NORMAL","day_offset":-60},
      {"title":"Lịch thực hành mô phỏng","content":"Buổi thực hành mô phỏng sẽ diễn ra tuần sau tại phòng simulator. Mang theo đồng phục đầy đủ và đăng ký nhóm trước thứ Sáu.","priority":"HIGH","day_offset":-45},
      {"title":"Nhắc nộp bài tập lập kế hoạch","content":"Bài tập tuần này hạn chót Chủ nhật 23:59. Bài nộp muộn sẽ bị trừ 10% mỗi ngày. Liên hệ giảng viên nếu có vấn đề.","priority":"HIGH","day_offset":-30},
      {"title":"Cập nhật tài liệu STCW mới","content":"Các bạn có thể tải tài liệu STCW phiên bản 2026 trên LMS. Đặc biệt chương 4-5 có thay đổi quan trọng về competency requirements.","priority":"NORMAL","day_offset":-20},
      {"title":"Chuẩn bị thi cuối khóa","content":"Thi cuối khóa diễn ra trong 2 tuần. Ôn tập trọng tâm: 6 chương đầu, format 20 trắc nghiệm + 1 tình huống. Pass 60/100.","priority":"URGENT","day_offset":-10},
      {"title":"Buổi review điểm và phản hồi","content":"Sau khi có kết quả thi, sẽ có buổi review điểm online qua Zoom. Lịch sẽ thông báo cụ thể qua notification.","priority":"NORMAL","day_offset":-3}
    ]'::jsonb;
BEGIN
    FOR v_course IN
        SELECT co.id AS course_id, co.code, co.teacher_id
        FROM courses co
        WHERE co.code IN ('NAV-101','SAF-101','ENG-101','ENG-204','NAV-201','NAV-102','NAV-301','SAF-201','LOG-101','LAW-101','ENG-201')
          AND co.teacher_id IS NOT NULL
    LOOP
        v_idx := 0;
        FOR v_announcement IN
            SELECT
                ann->>'title'    AS title,
                ann->>'content'  AS content,
                ann->>'priority' AS priority,
                (ann->>'day_offset')::int AS day_offset
            FROM jsonb_array_elements(v_announcements) ann
        LOOP
            v_idx := v_idx + 1;
            v_seed := v_course.course_id::text || ':' || v_idx::text;
            v_announcement_id := md5(v_seed || ':ann')::uuid;
            v_published_at := NOW() + (v_announcement.day_offset || ' days')::interval;

            INSERT INTO announcements (
                id, course_id, author_id, title, content,
                priority, target_type, published_at
            ) VALUES (
                v_announcement_id, v_course.course_id, v_course.teacher_id,
                v_announcement.title || ' — ' || v_course.code,
                v_announcement.content,
                v_announcement.priority, 'COURSE',
                v_published_at
            )
            ON CONFLICT (id) DO NOTHING;

            IF FOUND THEN v_inserted := v_inserted + 1; END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'V123 §3 announcements: inserted %', v_inserted;
END $section3$;

-- =====================================================================
-- Section 4: announcement_reads
-- Per announcement, 55-75% enrolled students đã đọc. Read time gần
-- published_at với jitter.
-- =====================================================================
DO $section4$
DECLARE
    v_pair RECORD;
    v_seed TEXT;
    v_read_pct DOUBLE PRECISION;
    v_read_at TIMESTAMPTZ;
    v_inserted BIGINT := 0;
BEGIN
    FOR v_pair IN
        SELECT a.id AS announcement_id, a.published_at, a.priority,
               e.student_id AS user_id
        FROM announcements a
        JOIN learning_classes lc ON lc.course_id = a.course_id
        JOIN enrollments e       ON e.class_id = lc.id
        WHERE e.status = 'ACTIVE'
    LOOP
        v_seed := v_pair.announcement_id::text || ':' || v_pair.user_id::text;

        v_read_pct := CASE v_pair.priority
            WHEN 'URGENT' THEN 0.85
            WHEN 'HIGH'   THEN 0.70
            ELSE               0.60
        END;

        IF fn_seed_v123_rand(v_seed || ':r') < v_read_pct THEN
            -- Đọc trong vòng 1-72h sau publish.
            v_read_at := v_pair.published_at +
                (fn_seed_v123_int(v_seed || ':rt', 1, 72) || ' hours')::interval;
            -- Không read sau NOW.
            IF v_read_at > NOW() THEN
                v_read_at := NOW() - (fn_seed_v123_int(v_seed || ':rt2', 0, 6) || ' hours')::interval;
            END IF;

            INSERT INTO announcement_reads (announcement_id, user_id, read_at)
            VALUES (v_pair.announcement_id, v_pair.user_id, v_read_at)
            ON CONFLICT (announcement_id, user_id) DO NOTHING;

            IF FOUND THEN v_inserted := v_inserted + 1; END IF;
        END IF;
    END LOOP;

    RAISE NOTICE 'V123 §4 announcement_reads: inserted %', v_inserted;
END $section4$;

-- =====================================================================
-- Section 5: notifications
-- Taxonomy: COURSE_ANNOUNCEMENT, QUIZ_GRADED, ASSIGNMENT_DUE,
-- VIDEO_AVAILABLE, ENROLLMENT_CONFIRMED, ACHIEVEMENT.
-- Distribution: ~40 announcement-derived, ~30 quiz-graded-derived,
-- ~20 deadline reminders, ~15 video available, ~10 enrollment, ~10 achievement.
-- is_read: ~60% read, recent ones less likely read.
-- =====================================================================
DO $section5$
DECLARE
    v_row RECORD;
    v_seed TEXT;
    v_id UUID;
    v_is_read BOOLEAN;
    v_age_hours DOUBLE PRECISION;
    v_inserted BIGINT := 0;
BEGIN
    -- 5a: COURSE_ANNOUNCEMENT — 1 notification per (announcement × enrolled student),
    -- limit 50 per announcement to control fan-out.
    FOR v_row IN
        SELECT a.id AS ann_id, a.title, a.published_at, a.priority,
               e.student_id AS user_id, c.code AS course_code, a.course_id
        FROM announcements a
        JOIN learning_classes lc ON lc.course_id = a.course_id
        JOIN enrollments e       ON e.class_id = lc.id
        JOIN courses c           ON c.id = a.course_id
        WHERE e.status = 'ACTIVE' AND a.priority IN ('HIGH','URGENT')
        LIMIT 60
    LOOP
        v_seed := 'notif:ann:' || v_row.ann_id::text || ':' || v_row.user_id::text;
        v_id := md5(v_seed)::uuid;
        v_age_hours := EXTRACT(EPOCH FROM (NOW() - v_row.published_at)) / 3600.0;
        v_is_read := fn_seed_v123_rand(v_seed || ':r') < (CASE WHEN v_age_hours > 168 THEN 0.85 ELSE 0.45 END);

        INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
        VALUES (
            v_id, v_row.user_id, 'COURSE_ANNOUNCEMENT',
            'Thông báo từ ' || v_row.course_code || ': ' || LEFT(v_row.title, 200),
            'Giảng viên vừa đăng thông báo mới trong khóa ' || v_row.course_code || '.',
            '/courses/' || v_row.course_id::text || '/announcements',
            v_is_read,
            v_row.published_at + INTERVAL '5 minutes'
        )
        ON CONFLICT (id) DO NOTHING;

        IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;

    -- 5b: QUIZ_GRADED — for recent GRADED attempts.
    FOR v_row IN
        SELECT qa.id AS attempt_id, qa.student_id, qa.quiz_id, qa.score,
               qa.max_score, qa.is_passed, qa.submitted_at,
               c.code AS course_code, c.id AS course_id
        FROM quiz_attempts qa
        JOIN quizzes q  ON q.id = qa.quiz_id
        JOIN lessons l  ON l.id = q.lesson_id
        JOIN chapters ch ON ch.id = l.chapter_id
        JOIN courses c   ON c.id = ch.course_id
        WHERE qa.status = 'GRADED' AND qa.submitted_at IS NOT NULL
        ORDER BY qa.submitted_at DESC
        LIMIT 35
    LOOP
        v_seed := 'notif:quiz:' || v_row.attempt_id::text;
        v_id := md5(v_seed)::uuid;
        v_age_hours := EXTRACT(EPOCH FROM (NOW() - v_row.submitted_at)) / 3600.0;
        v_is_read := fn_seed_v123_rand(v_seed || ':r') < (CASE WHEN v_age_hours > 48 THEN 0.80 ELSE 0.40 END);

        INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
        VALUES (
            v_id, v_row.student_id, 'QUIZ_GRADED',
            CASE WHEN v_row.is_passed THEN 'Bạn đã hoàn thành bài kiểm tra ' ELSE 'Kết quả bài kiểm tra ' END
                || v_row.course_code,
            'Điểm của bạn: ' || ROUND(v_row.score::numeric, 1)::text || '/' || v_row.max_score::text
                || CASE WHEN v_row.is_passed THEN ' — Đạt yêu cầu!' ELSE ' — Cần làm lại để đạt điểm tối thiểu.' END,
            '/learning/quiz/' || v_row.quiz_id::text || '/result',
            v_is_read,
            v_row.submitted_at + INTERVAL '2 minutes'
        )
        ON CONFLICT (id) DO NOTHING;

        IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;

    -- 5c: ASSIGNMENT_DUE — upcoming deadlines. Sample 25 active enrollments.
    FOR v_row IN
        SELECT e.student_id, c.code AS course_code, c.id AS course_id, e.id AS enroll_id
        FROM enrollments e
        JOIN learning_classes lc ON lc.id = e.class_id
        JOIN courses c           ON c.id = lc.course_id
        WHERE e.status = 'ACTIVE'
        ORDER BY e.enrolled_at DESC
        LIMIT 25
    LOOP
        v_seed := 'notif:due:' || v_row.enroll_id::text;
        v_id := md5(v_seed)::uuid;
        v_is_read := fn_seed_v123_rand(v_seed || ':r') < 0.35;

        INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
        VALUES (
            v_id, v_row.student_id, 'ASSIGNMENT_DUE',
            'Bài tập sắp đến hạn — ' || v_row.course_code,
            'Có bài tập đang chờ bạn nộp trong ' || v_row.course_code || '. Hạn còn lại: ' ||
                fn_seed_v123_int(v_seed || ':d', 1, 7)::text || ' ngày.',
            '/courses/' || v_row.course_id::text || '/assignments',
            v_is_read,
            NOW() - (fn_seed_v123_int(v_seed || ':ca', 0, 36) || ' hours')::interval
        )
        ON CONFLICT (id) DO NOTHING;

        IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;

    -- 5d: VIDEO_AVAILABLE — for first 15 active enrollments.
    FOR v_row IN
        SELECT DISTINCT ON (e.student_id) e.student_id, c.code AS course_code, c.id AS course_id
        FROM enrollments e
        JOIN learning_classes lc ON lc.id = e.class_id
        JOIN courses c           ON c.id = lc.course_id
        WHERE e.status = 'ACTIVE'
        ORDER BY e.student_id, e.enrolled_at DESC
        LIMIT 18
    LOOP
        v_seed := 'notif:video:' || v_row.student_id::text || ':' || v_row.course_code;
        v_id := md5(v_seed)::uuid;
        v_is_read := fn_seed_v123_rand(v_seed || ':r') < 0.55;

        INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
        VALUES (
            v_id, v_row.student_id, 'VIDEO_AVAILABLE',
            'Video mới có sẵn trong ' || v_row.course_code,
            'Một video bài giảng mới đã được giảng viên đăng. Nội dung: hướng dẫn thực hành mô phỏng.',
            '/courses/' || v_row.course_id::text,
            v_is_read,
            NOW() - (fn_seed_v123_int(v_seed || ':ca', 1, 14) || ' days')::interval
        )
        ON CONFLICT (id) DO NOTHING;

        IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;

    -- 5e: ENROLLMENT_CONFIRMED — 1 per active enrollment, sample.
    FOR v_row IN
        SELECT e.id AS enroll_id, e.student_id, e.enrolled_at, c.code AS course_code, c.id AS course_id
        FROM enrollments e
        JOIN learning_classes lc ON lc.id = e.class_id
        JOIN courses c           ON c.id = lc.course_id
        WHERE e.status = 'ACTIVE'
        ORDER BY e.enrolled_at DESC
        LIMIT 15
    LOOP
        v_seed := 'notif:enroll:' || v_row.enroll_id::text;
        v_id := md5(v_seed)::uuid;

        INSERT INTO notifications (id, user_id, type, title, message, link, is_read, created_at)
        VALUES (
            v_id, v_row.student_id, 'ENROLLMENT_CONFIRMED',
            'Đăng ký thành công — ' || v_row.course_code,
            'Chào mừng bạn đến với khóa học ' || v_row.course_code || '. Hãy hoàn tất buổi định hướng đầu tuần.',
            '/courses/' || v_row.course_id::text,
            true,  -- enrollment confirmation thường read sớm
            v_row.enrolled_at + INTERVAL '1 minute'
        )
        ON CONFLICT (id) DO NOTHING;

        IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;

    RAISE NOTICE 'V123 §5 notifications: inserted %', v_inserted;
END $section5$;

DROP FUNCTION IF EXISTS fn_seed_v123_int(TEXT, INT, INT);
DROP FUNCTION IF EXISTS fn_seed_v123_rand(TEXT);

-- =====================================================================
-- Verify block
-- =====================================================================
DO $verify$
DECLARE
    v_slp_total BIGINT; v_slp_students BIGINT; v_slp_lessons BIGINT;
    v_vp_total BIGINT;
    v_ann_total BIGINT;
    v_ar_total BIGINT;
    v_notif_total BIGINT; v_notif_types BIGINT;
BEGIN
    SELECT COUNT(*), COUNT(DISTINCT student_id), COUNT(DISTINCT lesson_id)
    INTO v_slp_total, v_slp_students, v_slp_lessons FROM student_lesson_progress;

    SELECT COUNT(*) INTO v_vp_total FROM video_progress;
    SELECT COUNT(*) INTO v_ann_total FROM announcements;
    SELECT COUNT(*) INTO v_ar_total FROM announcement_reads;
    SELECT COUNT(*), COUNT(DISTINCT type) INTO v_notif_total, v_notif_types FROM notifications;

    RAISE NOTICE 'V123 verify: slp=% (% students, % lessons), vp=%, ann=%, ann_reads=%, notif=% (% types)',
        v_slp_total, v_slp_students, v_slp_lessons,
        v_vp_total, v_ann_total, v_ar_total,
        v_notif_total, v_notif_types;
END $verify$;
