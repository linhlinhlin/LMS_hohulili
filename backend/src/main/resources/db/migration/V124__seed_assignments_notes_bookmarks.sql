-- =====================================================================
-- V124: Seed assignment_submissions + student_notes + bookmarks
-- Closes #267 Tier A (Tier B contract tests sẽ là follow-up issue).
--
-- Sau V122 (quiz_attempts) + V123 (progress/announcements/notifications),
-- backfill 3 tables còn rỗng để demo SpeedGrader, learner study behavior.
--
-- §1 assignment_submissions (≥80 rows): SpeedGrader demo + grading flow
-- §2 student_notes          (≥40 rows): study notes (Pareto distribution)
-- §3 bookmarks              (≥40 rows): saved lessons/positions
--
-- SOTA reference:
--   • Canvas SpeedGrader  — submission lifecycle (DRAFT→SUBMITTED→GRADED→RETURNED)
--   • Coursera notebook   — student notes pattern
--   • Notion bookmarks    — saved-for-later UX
--   • Pareto principle    — top 20% students = 50-60% notes/bookmarks volume
--   • Stripe idempotency  — deterministic UUID + UNIQUE constraints
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_seed_v124_rand(seed TEXT)
RETURNS DOUBLE PRECISION AS $fn$
    SELECT (('x' || substring(md5(seed) FROM 1 FOR 8))::bit(32)::bigint::double precision)
           / 4294967295.0;
$fn$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION fn_seed_v124_int(seed TEXT, low INT, high INT)
RETURNS INT AS $fn$
    SELECT GREATEST(low, LEAST(high, low + (fn_seed_v124_rand(seed) * GREATEST(1, high - low + 1))::int));
$fn$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION fn_seed_v124_triangular(
    seed TEXT, mean_val DOUBLE PRECISION, spread DOUBLE PRECISION,
    low DOUBLE PRECISION, high DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $fn$
    SELECT GREATEST(low, LEAST(high,
        mean_val + (fn_seed_v124_rand(seed || ':a')
                  - fn_seed_v124_rand(seed || ':b')) * spread
    ));
$fn$ LANGUAGE sql IMMUTABLE;

-- =====================================================================
-- §1 assignment_submissions
-- Per assignment, select 5-8 enrolled students. Status mix theo spec
-- Codex (Canvas SpeedGrader pattern):
--   GRADED 65%, SUBMITTED 15% (chờ grade), LATE 8%,
--   RETURNED 5% (cần revision), RESUBMITTED 4%, DRAFT 3%.
-- Grade distribution: triangular 75±15, P50 ~75-80.
-- Vietnamese maritime feedback templates.
-- =====================================================================
DO $section1$
DECLARE
    v_assignment RECORD;
    v_student RECORD;
    v_seed TEXT;
    v_status TEXT;
    v_status_roll INT;
    v_grade DOUBLE PRECISION;
    v_max_grade DOUBLE PRECISION := 10.0;
    v_submitted_at TIMESTAMPTZ;
    v_graded_at TIMESTAMPTZ;
    v_feedback TEXT;
    v_content TEXT;
    v_grader_id UUID;
    v_inserted BIGINT := 0;

    v_feedback_pool_pass TEXT[] := ARRAY[
        'Bài làm tốt, lập luận rõ ràng và đúng quy trình. Tiếp tục phát huy.',
        'Đáp ứng đầy đủ tiêu chí, có ví dụ thực tế. Có thể bổ sung thêm phần phân tích an toàn.',
        'Tốt. Trình bày khoa học, có sơ đồ minh họa rõ ràng theo chuẩn STCW.',
        'Hoàn thành tốt yêu cầu. Lưu ý sử dụng đúng thuật ngữ hàng hải tiếng Anh trong tài liệu chính thức.',
        'Bài viết có chiều sâu, áp dụng đúng SOLAS/MARPOL. Đạt mục tiêu khóa học.'
    ];
    v_feedback_pool_revise TEXT[] := ARRAY[
        'Cần bổ sung phần đánh giá rủi ro theo quy định COLREG. Vui lòng nộp lại.',
        'Phần lập kế hoạch hành trình thiếu đoạn kiểm tra hải đồ và độ sâu. Sửa và nộp lại.',
        'Tính toán cuộc phí chưa đầy đủ phụ phí BAF/THC. Cập nhật và nộp lại.',
        'Sơ đồ chữa cháy thiếu vị trí EEBD. Bổ sung và nộp lại tuần sau.',
        'Phần diễn giải MARPOL Annex chưa khớp tình huống. Đọc lại tài liệu chương 6 rồi viết lại.'
    ];
    v_content_pool TEXT[] := ARRAY[
        'Bài làm gồm phân tích, tính toán và đề xuất phương án theo yêu cầu. Tài liệu đính kèm trong file PDF.',
        'Em đã thực hiện theo đúng quy trình STCW, kèm sơ đồ và bảng dữ liệu. Vui lòng xem file đính kèm.',
        'Bài tập gồm 3 phần: lý thuyết, tính toán và đề xuất giải pháp. Tham khảo tài liệu IMO và sách giáo trình.'
    ];
BEGIN
    FOR v_assignment IN
        SELECT
            a.id           AS assignment_id,
            l.id           AS lesson_id,
            ch.course_id,
            co.code        AS course_code,
            co.teacher_id  AS grader_id
        FROM assignments a
        JOIN lessons l   ON l.id = a.lesson_id
        JOIN chapters ch ON ch.id = l.chapter_id
        JOIN courses co  ON co.id = ch.course_id
    LOOP
        v_grader_id := v_assignment.grader_id;

        -- Pick 4-7 enrolled students per assignment.
        FOR v_student IN
            SELECT DISTINCT e.student_id
            FROM enrollments e
            JOIN learning_classes lc ON lc.id = e.class_id
            WHERE lc.course_id = v_assignment.course_id AND e.status = 'ACTIVE'
            ORDER BY e.student_id
            LIMIT 6
        LOOP
            v_seed := v_assignment.assignment_id::text || ':' || v_student.student_id::text;

            -- Status mix: 65% GRADED, 15% SUBMITTED, 8% LATE, 5% RETURNED, 4% RESUBMITTED, 3% DRAFT.
            v_status_roll := fn_seed_v124_int(v_seed || ':st', 0, 99);
            v_status := CASE
                WHEN v_status_roll < 65 THEN 'GRADED'
                WHEN v_status_roll < 80 THEN 'SUBMITTED'
                WHEN v_status_roll < 88 THEN 'LATE'
                WHEN v_status_roll < 93 THEN 'RETURNED'
                WHEN v_status_roll < 97 THEN 'RESUBMITTED'
                ELSE                         'DRAFT'
            END;

            -- Submitted_at: 7-60 ngày trước.
            v_submitted_at := NOW() - (fn_seed_v124_int(v_seed || ':sub', 7, 60) || ' days')::interval;

            -- Grade only for GRADED/RESUBMITTED.
            IF v_status IN ('GRADED', 'RESUBMITTED') THEN
                v_grade := fn_seed_v124_triangular(v_seed || ':gr', 76.0, 16.0, 30.0, 100.0);
                v_grade := ROUND((v_grade / 100.0 * v_max_grade)::numeric, 2)::double precision;
                v_graded_at := v_submitted_at + (fn_seed_v124_int(v_seed || ':gat', 1, 7) || ' days')::interval;
                IF v_grade >= 6.0 THEN
                    v_feedback := v_feedback_pool_pass[fn_seed_v124_int(v_seed || ':fb', 1, array_length(v_feedback_pool_pass, 1))];
                ELSE
                    v_feedback := v_feedback_pool_revise[fn_seed_v124_int(v_seed || ':fb', 1, array_length(v_feedback_pool_revise, 1))];
                END IF;
            ELSIF v_status = 'RETURNED' THEN
                v_grade := NULL;
                v_graded_at := v_submitted_at + (fn_seed_v124_int(v_seed || ':rt', 1, 5) || ' days')::interval;
                v_feedback := v_feedback_pool_revise[fn_seed_v124_int(v_seed || ':fb', 1, array_length(v_feedback_pool_revise, 1))];
            ELSIF v_status = 'DRAFT' THEN
                -- DRAFT: chưa nộp, submitted_at NULL, content draft.
                v_submitted_at := NULL;
                v_grade := NULL;
                v_graded_at := NULL;
                v_feedback := NULL;
            ELSE
                -- SUBMITTED, LATE: nộp rồi, chờ grade.
                v_grade := NULL;
                v_graded_at := NULL;
                v_feedback := NULL;
            END IF;

            -- Content sample.
            v_content := v_content_pool[fn_seed_v124_int(v_seed || ':ct', 1, array_length(v_content_pool, 1))];

            INSERT INTO assignment_submissions (
                id, assignment_id, course_id, student_id, status,
                content, file_url, file_name, grade, max_grade, feedback,
                graded_by, graded_at, submitted_at, created_at, version
            ) VALUES (
                md5(v_seed || ':id')::uuid,
                v_assignment.assignment_id,
                v_assignment.course_id,
                v_student.student_id,
                v_status,
                v_content,
                'https://holilihu.online/uploads/assignments/seed-' || md5(v_seed || ':file')::text || '.pdf',
                'baitap_' || v_assignment.course_code || '.pdf',
                v_grade,
                CASE WHEN v_status IN ('GRADED','RESUBMITTED','RETURNED') THEN v_max_grade ELSE NULL END,
                v_feedback,
                CASE WHEN v_status IN ('GRADED','RESUBMITTED','RETURNED') THEN v_grader_id ELSE NULL END,
                v_graded_at,
                v_submitted_at,
                COALESCE(v_submitted_at, NOW() - (fn_seed_v124_int(v_seed || ':ca', 1, 14) || ' days')::interval),
                0
            )
            ON CONFLICT (assignment_id, student_id) DO NOTHING;

            IF FOUND THEN v_inserted := v_inserted + 1; END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'V124 §1 assignment_submissions: inserted %', v_inserted;
END $section1$;

-- =====================================================================
-- §2 student_notes
-- Pareto: top ~20% students take 50-60% notes. ~10 students × 5 notes
-- = ~50 notes. Vietnamese maritime study notes.
-- =====================================================================
DO $section2$
DECLARE
    v_pair RECORD;
    v_seed TEXT;
    v_inserted BIGINT := 0;
    v_idx INT;
    v_note_id UUID;
    v_note_count INT;

    v_note_titles TEXT[] := ARRAY[
        'Ghi chú: La bàn từ và độ lệch',
        'Tổng hợp: Quy tắc tránh va COLREG',
        'Cheatsheet: ECDIS layer setup',
        'Thuật ngữ STCW cần nhớ',
        'Sơ đồ: hệ thống phòng cháy tàu',
        'Bài học từ case study cứu nạn',
        'Quy trình MOB (Man Overboard)',
        'Tính toán EEDI cho tàu container',
        'MARPOL Annex VI — phát thải SOx/NOx',
        'Incoterms 2020 — FOB vs CIF',
        'Logbook entries chuẩn IMO',
        'Bảo dưỡng định kỳ máy chính diesel'
    ];
    v_note_contents TEXT[] := ARRAY[
        'La bàn từ phụ thuộc địa từ trường. Độ lệch (deviation) khác nhau theo hướng tàu, cần lập bảng deviation. Bảo dưỡng định kỳ 6 tháng.',
        'COLREG quy định 39 điều. Quan trọng nhất: rule 13 overtaking, rule 14 head-on, rule 15 crossing. Stand-on vessel maintain course, give-way alter course early.',
        'ECDIS chart layers: bathymetry, hazards, traffic, weather. Set safety contour 1m deeper than draft. Update notices to mariners hàng tuần.',
        'STCW table A-II/1: navigation, cargo handling, controlling operation. STCW A-III/1: marine engineering. BST = Basic Safety Training.',
        'Hệ thống PCCC: detector → control panel → alarm + suppression. CO2 cho buồng máy, foam cho boong dầu. EEBD 15 phút thoát nạn.',
        'Case 2024: tàu container chìm ở Biển Đông. Lessons: muster drill phải chuẩn bị thật, EPIRB testing 6 tháng, GMDSS distress alert phải biết bấm.',
        'MOB sequence: hét "Man overboard!", ném phao, ấn nút MOB GPS, Williamson turn (60° rồi reverse), recovery boat, GMDSS alert nếu cần.'
    ];
BEGIN
    -- Pareto: 30 students, top 8 lấy 70% notes (~30 notes), còn lại ít hơn.
    -- Dùng window function deduplicate (PostgreSQL không có MIN trên UUID).
    FOR v_pair IN
        WITH student_courses AS (
            SELECT e.student_id, lc.course_id,
                   ROW_NUMBER() OVER (
                       PARTITION BY e.student_id
                       ORDER BY md5(lc.course_id::text || e.student_id::text)
                   ) AS course_rank
            FROM enrollments e
            JOIN learning_classes lc ON lc.id = e.class_id
            WHERE e.status = 'ACTIVE'
        ),
        deduped AS (
            SELECT student_id, course_id FROM student_courses WHERE course_rank = 1
        ),
        ranked AS (
            SELECT student_id, course_id,
                   ROW_NUMBER() OVER (ORDER BY md5(student_id::text)) AS rnk
            FROM deduped
        )
        SELECT student_id, course_id, rnk FROM ranked LIMIT 25
    LOOP
        v_seed := v_pair.student_id::text;

        -- Pareto: top 20% có 5-8 notes, mid có 2-3, bottom có 0-1.
        IF v_pair.rnk <= 5 THEN
            v_note_count := fn_seed_v124_int(v_seed || ':nc', 5, 8);
        ELSIF v_pair.rnk <= 15 THEN
            v_note_count := fn_seed_v124_int(v_seed || ':nc', 2, 3);
        ELSE
            v_note_count := fn_seed_v124_int(v_seed || ':nc', 0, 1);
        END IF;

        FOR v_idx IN 1..v_note_count LOOP
            v_seed := v_pair.student_id::text || ':n' || v_idx::text;
            v_note_id := md5(v_seed || ':id')::uuid;

            INSERT INTO student_notes (
                id, user_id, course_id, lesson_id, title, content, tags, is_public,
                created_at, updated_at
            ) VALUES (
                v_note_id, v_pair.student_id, v_pair.course_id, NULL,
                v_note_titles[fn_seed_v124_int(v_seed || ':t', 1, array_length(v_note_titles, 1))],
                v_note_contents[fn_seed_v124_int(v_seed || ':c', 1, array_length(v_note_contents, 1))],
                ARRAY['stcw', 'maritime', 'ôn tập']::text[],
                false,
                NOW() - (fn_seed_v124_int(v_seed || ':ca', 1, 60) || ' days')::interval,
                NOW() - (fn_seed_v124_int(v_seed || ':ua', 0, 7) || ' days')::interval
            )
            ON CONFLICT (id) DO NOTHING;

            IF FOUND THEN v_inserted := v_inserted + 1; END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'V124 §2 student_notes: inserted %', v_inserted;
END $section2$;

-- =====================================================================
-- §3 bookmarks (set-based)
-- Pareto distribution: top 5 students × 5 bookmarks, mid 10 × 2, rest 0.
-- Mỗi (student, lesson) pair tạo 1 bookmark deterministic.
-- UNIQUE (user_id, url) → ON CONFLICT idempotent.
-- =====================================================================
WITH active_students AS (
    SELECT DISTINCT e.student_id,
           DENSE_RANK() OVER (ORDER BY md5(e.student_id::text)) AS student_rank
    FROM enrollments e
    WHERE e.status = 'ACTIVE'
),
student_quota AS (
    SELECT student_id, student_rank,
           CASE
               WHEN student_rank <= 5  THEN 5
               WHEN student_rank <= 15 THEN 2
               ELSE 0
           END AS quota
    FROM active_students
    WHERE student_rank <= 25
),
student_lessons AS (
    SELECT
        sq.student_id,
        sq.quota,
        l.id            AS lesson_id,
        ch.course_id,
        ROW_NUMBER() OVER (
            PARTITION BY sq.student_id
            ORDER BY md5(l.id::text || sq.student_id::text)
        ) AS lesson_rank
    FROM student_quota sq
    JOIN enrollments e        ON e.student_id = sq.student_id AND e.status = 'ACTIVE'
    JOIN learning_classes lc  ON lc.id = e.class_id
    JOIN chapters ch          ON ch.course_id = lc.course_id
    JOIN lessons l            ON l.chapter_id = ch.id
    WHERE sq.quota > 0
),
selected AS (
    SELECT student_id, lesson_id, course_id
    FROM student_lessons
    WHERE lesson_rank <= quota
),
inserted AS (
    INSERT INTO bookmarks (id, user_id, course_id, lesson_id, title, url, position, metadata, created_at)
    SELECT
        md5('bookmark:' || s.student_id::text || ':' || s.lesson_id::text)::uuid,
        s.student_id,
        s.course_id,
        s.lesson_id,
        (ARRAY[
            'Đoạn quan trọng — ôn lại trước thi',
            'Sơ đồ STCW cần nhớ',
            'Ví dụ tính toán hải đồ',
            'Quy trình mô phỏng PCCC',
            'Đoạn giảng viên giải thích chi tiết',
            'Bài tập mẫu — tham khảo'
        ])[1 + (('x' || substring(md5('t:' || s.student_id::text || s.lesson_id::text) FROM 1 FOR 8))::bit(32)::bigint % 6)],
        '/learning/lesson/' || s.lesson_id::text || '?t=' ||
            (30 + (('x' || substring(md5('p:' || s.student_id::text || s.lesson_id::text) FROM 1 FOR 8))::bit(32)::bigint % 1470))::text,
        (30 + (('x' || substring(md5('p:' || s.student_id::text || s.lesson_id::text) FROM 1 FOR 8))::bit(32)::bigint % 1470))::int,
        jsonb_build_object('seedSource', 'V124', 'noteContext', 'video-position'),
        NOW() - ((1 + (('x' || substring(md5('c:' || s.student_id::text || s.lesson_id::text) FROM 1 FOR 8))::bit(32)::bigint % 30))::text || ' days')::interval
    FROM selected s
    ON CONFLICT (user_id, url) DO NOTHING
    RETURNING 1
)
SELECT 'V124 §3 bookmarks inserted: ' || COUNT(*)::text AS result FROM inserted;

DROP FUNCTION IF EXISTS fn_seed_v124_triangular(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS fn_seed_v124_int(TEXT, INT, INT);
DROP FUNCTION IF EXISTS fn_seed_v124_rand(TEXT);

-- Verify block.
DO $verify$
DECLARE
    v_sub_total BIGINT; v_sub_graded BIGINT; v_sub_p50 DOUBLE PRECISION;
    v_notes BIGINT; v_bm BIGINT;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'GRADED'),
           ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY grade / NULLIF(max_grade,0) * 100)::numeric, 1)
    INTO v_sub_total, v_sub_graded, v_sub_p50 FROM assignment_submissions;

    SELECT COUNT(*) INTO v_notes FROM student_notes;
    SELECT COUNT(*) INTO v_bm FROM bookmarks;

    RAISE NOTICE 'V124 verify: submissions=% (graded=%, p50=%), notes=%, bookmarks=%',
        v_sub_total, v_sub_graded, v_sub_p50, v_notes, v_bm;
END $verify$;
