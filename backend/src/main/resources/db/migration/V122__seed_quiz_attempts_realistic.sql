-- =====================================================================
-- V122: Seed quiz_attempts với realistic distribution cho TTTN demo
-- Closes #264 (linhlinhlin/LMS_hohulili)
--
-- Mục tiêu: ≥150 attempts, ≥20 distinct students, ≥8 distinct quizzes,
-- status mix realistic, score truncated-normal-ish, multi-attempt long-tail.
--
-- Convention: Moodle "Maximum grade" pattern (matches QuizAttemptUseCase.java):
--   max_score = quiz.max_score_scale (default 10.0)
--   score     = (correct_points / total_points) * max_score_scale
--   passed    = score >= (passing_score / 100) * max_score_scale
--
-- answers JSONB schema (matches QuizAttempt.AttemptItem Java domain):
--   { "<questionId>": {
--       "questionId": "<id>", "selectedOption": "<key>"|null,
--       "studentAnswer": {"selectedOption": "<key>"}|null,
--       "isCorrect": <bool>|null, "pointsEarned": <num>|null,
--       "correctOption": "<key>"|null, "correctOptions": [<keys>]|null,
--       "feedback": null
--     }, ... }
--
-- SOTA reference:
--   • Canvas Quiz Submissions API — attempt lifecycle, kept score.
--     https://canvas.instructure.com/doc/api/quiz_submissions.html
--   • Coursera progress tracking — fail-first-then-pass progression.
--     https://blog.coursera.org/new-progress-tracking-features-on-coursera/
--   • Stripe idempotency — deterministic UUID = no double-insert on rerun.
--     https://docs.stripe.com/api/idempotent_requests
--   • Moodle gradebook scaling — maxScore scale convention preserved.
--
-- Idempotent: id = md5(student_id || quiz_id || attempt_number)::uuid.
-- Re-run safely: ON CONFLICT (id) DO NOTHING.
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_seed_v122_rand(seed TEXT)
RETURNS DOUBLE PRECISION AS $fn$
    SELECT (('x' || substring(md5(seed) FROM 1 FOR 8))::bit(32)::bigint::double precision)
           / 4294967295.0;
$fn$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION fn_seed_v122_int(seed TEXT, low INT, high INT)
RETURNS INT AS $fn$
    SELECT low + (fn_seed_v122_rand(seed) * GREATEST(1, high - low + 1))::int;
$fn$ LANGUAGE sql IMMUTABLE;

-- Triangular distribution (sum of 2 uniforms) — approximate normal cluster
-- around mean_val ± spread, clamped to [low, high].
CREATE OR REPLACE FUNCTION fn_seed_v122_triangular(
    seed TEXT, mean_val DOUBLE PRECISION, spread DOUBLE PRECISION,
    low DOUBLE PRECISION, high DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $fn$
    SELECT GREATEST(low, LEAST(high,
        mean_val + (fn_seed_v122_rand(seed || ':a')
                  - fn_seed_v122_rand(seed || ':b')) * spread
    ));
$fn$ LANGUAGE sql IMMUTABLE;

DO $migration$
DECLARE
    v_pair RECORD;
    v_attempt_no INT;
    v_num_attempts INT;
    v_seed TEXT;
    v_status TEXT;
    v_status_roll INT;
    v_target_pct DOUBLE PRECISION;
    v_score_scaled DOUBLE PRECISION;
    v_passing_threshold DOUBLE PRECISION;
    v_total_points DOUBLE PRECISION := 0;
    v_correct_points DOUBLE PRECISION := 0;
    v_attempt_id UUID;
    v_started_at TIMESTAMPTZ;
    v_submitted_at TIMESTAMPTZ;
    v_duration_min INT;
    v_difficulty TEXT;
    v_answers JSONB;
    v_q RECORD;
    v_correct_option TEXT;
    v_chosen_option TEXT;
    v_options TEXT[];
    v_option_count INT;
    v_correct_idx INT;
    v_correct_prob DOUBLE PRECISION;
    v_is_correct BOOLEAN;
    v_q_points_earned DOUBLE PRECISION;
    v_inserted BIGINT := 0;
BEGIN
    FOR v_pair IN
        SELECT DISTINCT
            e.student_id,
            q.id                                      AS quiz_id,
            COALESCE(q.passing_score, 60)             AS passing_score,
            COALESCE(q.max_attempts, 3)               AS max_attempts,
            COALESCE(q.time_limit_minutes, 30)        AS time_limit_minutes,
            COALESCE(q.max_score_scale, 10.0)         AS max_score_scale,
            co.code                                   AS course_code
        FROM enrollments e
        JOIN learning_classes lc ON lc.id = e.class_id
        JOIN courses co          ON co.id = lc.course_id
        JOIN chapters ch         ON ch.course_id = co.id
        JOIN lessons l           ON l.chapter_id = ch.id
        JOIN quizzes q           ON q.lesson_id = l.id
        WHERE e.status = 'ACTIVE'
    LOOP
        v_seed := v_pair.student_id::text || ':' || v_pair.quiz_id::text;

        -- Long-tail multi-attempt: 65% / 25% / 10%, capped by max_attempts.
        IF fn_seed_v122_rand(v_seed || ':na') < 0.65 THEN
            v_num_attempts := 1;
        ELSIF fn_seed_v122_rand(v_seed || ':na') < 0.90 THEN
            v_num_attempts := 2;
        ELSE
            v_num_attempts := 3;
        END IF;
        v_num_attempts := LEAST(v_num_attempts, v_pair.max_attempts);

        v_difficulty := CASE
            WHEN v_pair.course_code IN ('NAV-101', 'SAF-101', 'NAV-102') THEN 'BASIC'
            WHEN v_pair.course_code IN ('ENG-101', 'ENG-204', 'NAV-201', 'NAV-301') THEN 'ADVANCED'
            ELSE 'INTERMEDIATE'
        END;

        v_passing_threshold := (v_pair.passing_score::double precision / 100.0) * v_pair.max_score_scale;

        FOR v_attempt_no IN 1..v_num_attempts LOOP
            v_seed := v_pair.student_id::text || ':' || v_pair.quiz_id::text || ':' || v_attempt_no::text;
            v_attempt_id := md5(v_seed || ':id')::uuid;

            -- Status: 84% GRADED, 8% SUBMITTED, 5% IN_PROGRESS, 3% EXPIRED.
            v_status_roll := fn_seed_v122_int(v_seed || ':st', 0, 99);
            v_status := CASE
                WHEN v_status_roll < 84 THEN 'GRADED'
                WHEN v_status_roll < 92 THEN 'SUBMITTED'
                WHEN v_status_roll < 97 THEN 'IN_PROGRESS'
                ELSE                         'EXPIRED'
            END;

            -- Target percent for answer correctness probability. Means tuned
            -- để P50 (median) toàn bộ rơi vào 70-80 sau khi cộng retry boost
            -- và sample imbalance (BASIC chiếm phần lớn enrollment).
            v_target_pct := CASE v_difficulty
                WHEN 'BASIC'        THEN 72.0
                WHEN 'INTERMEDIATE' THEN 67.0
                ELSE                     62.0
            END;
            IF v_attempt_no > 1 THEN
                v_target_pct := v_target_pct + 6.0 * (v_attempt_no - 1);
            END IF;
            v_target_pct := fn_seed_v122_triangular(v_seed || ':sc', v_target_pct, 14.0, 30.0, 100.0);
            v_correct_prob := v_target_pct / 100.0;

            -- Timestamps.
            v_started_at := NOW() - (fn_seed_v122_int(v_seed || ':ts', 7, 75) || ' days')::interval;
            v_duration_min := fn_seed_v122_int(
                v_seed || ':du',
                GREATEST(5, v_pair.time_limit_minutes / 2),
                v_pair.time_limit_minutes
            );
            IF v_status = 'IN_PROGRESS' THEN
                v_submitted_at := NULL;
            ELSE
                v_submitted_at := v_started_at + (v_duration_min || ' minutes')::interval;
            END IF;

            -- Build answers JSONB matching QuizAttempt.AttemptItem schema.
            v_total_points := 0;
            v_correct_points := 0;
            v_answers := '{}'::jsonb;

            FOR v_q IN
                SELECT q.id AS question_id,
                       COALESCE(qq.points, 1)::double precision AS points
                FROM quiz_questions qq
                JOIN questions q ON q.id = qq.question_id
                WHERE qq.quiz_id = v_pair.quiz_id
                ORDER BY qq.display_order
            LOOP
                v_total_points := v_total_points + v_q.points;

                SELECT option_key INTO v_correct_option
                FROM question_options
                WHERE question_id = v_q.question_id AND is_correct = true
                ORDER BY display_order
                LIMIT 1;

                SELECT array_agg(option_key ORDER BY display_order)
                INTO v_options
                FROM question_options
                WHERE question_id = v_q.question_id;

                IF v_correct_option IS NULL OR v_options IS NULL THEN
                    -- Question without correct option — skip.
                    CONTINUE;
                END IF;

                v_option_count := array_length(v_options, 1);

                -- IN_PROGRESS: skip ~40% questions (chưa kịp trả lời).
                IF v_status = 'IN_PROGRESS'
                   AND fn_seed_v122_rand(v_seed || ':q' || v_q.question_id::text || ':skip') > 0.6 THEN
                    -- Insert null-answer item (matches existing IN_PROGRESS pattern).
                    v_answers := v_answers || jsonb_build_object(
                        v_q.question_id::text,
                        jsonb_build_object(
                            'questionId',     v_q.question_id::text,
                            'selectedOption', NULL,
                            'studentAnswer',  NULL,
                            'isCorrect',      NULL,
                            'pointsEarned',   NULL,
                            'correctOption',  NULL,
                            'correctOptions', NULL,
                            'feedback',       NULL
                        )
                    );
                    CONTINUE;
                END IF;

                -- Decide correct vs wrong.
                IF fn_seed_v122_rand(v_seed || ':q' || v_q.question_id::text || ':ans') < v_correct_prob THEN
                    v_chosen_option := v_correct_option;
                    v_is_correct := true;
                    v_q_points_earned := v_q.points;
                    v_correct_points := v_correct_points + v_q.points;
                ELSE
                    SELECT array_position(v_options, v_correct_option) INTO v_correct_idx;
                    v_chosen_option := v_options[
                        1 + ((fn_seed_v122_int(
                                v_seed || ':q' || v_q.question_id::text || ':wrong',
                                0, GREATEST(0, v_option_count - 2)
                              ) + COALESCE(v_correct_idx, 1)) % v_option_count)
                    ];
                    v_is_correct := false;
                    v_q_points_earned := 0.0;
                END IF;

                -- For IN_PROGRESS items that ARE answered: isCorrect/pointsEarned NULL
                -- (chưa graded). For GRADED/SUBMITTED/EXPIRED: full grade info.
                v_answers := v_answers || jsonb_build_object(
                    v_q.question_id::text,
                    jsonb_build_object(
                        'questionId',     v_q.question_id::text,
                        'selectedOption', v_chosen_option,
                        'studentAnswer',  jsonb_build_object('selectedOption', v_chosen_option),
                        'isCorrect',
                            CASE WHEN v_status = 'IN_PROGRESS' THEN NULL ELSE to_jsonb(v_is_correct) END,
                        'pointsEarned',
                            CASE WHEN v_status = 'IN_PROGRESS' THEN NULL ELSE to_jsonb(v_q_points_earned) END,
                        'correctOption',
                            CASE WHEN v_status IN ('GRADED','SUBMITTED','EXPIRED') THEN to_jsonb(v_correct_option) ELSE NULL END,
                        'correctOptions', NULL,
                        'feedback',       NULL
                    )
                );
            END LOOP;

            -- Skip quiz nào không có question hợp lệ (orphan quiz_questions
            -- hoặc questions thiếu correct option) — sẽ tạo row vô nghĩa.
            IF v_total_points = 0 THEN
                CONTINUE;
            END IF;

            -- Compute scaled score (Moodle convention).
            IF v_status IN ('GRADED', 'SUBMITTED') THEN
                v_score_scaled := (v_correct_points / v_total_points) * v_pair.max_score_scale;
                v_score_scaled := ROUND(v_score_scaled::numeric, 2)::double precision;
            ELSIF v_status = 'EXPIRED' THEN
                -- EXPIRED: partial score (only what was answered before time ran out).
                v_score_scaled := (v_correct_points / v_total_points) * v_pair.max_score_scale * 0.5;
                v_score_scaled := ROUND(v_score_scaled::numeric, 2)::double precision;
            ELSE
                v_score_scaled := NULL;  -- IN_PROGRESS.
            END IF;

            INSERT INTO quiz_attempts (
                id, quiz_id, student_id, status, answers,
                score, max_score, started_at, submitted_at, created_at, version, is_passed
            ) VALUES (
                v_attempt_id, v_pair.quiz_id, v_pair.student_id, v_status, v_answers,
                v_score_scaled,
                v_pair.max_score_scale,
                v_started_at, v_submitted_at, v_started_at, 0,
                CASE
                    WHEN v_status IN ('GRADED','SUBMITTED') AND v_score_scaled IS NOT NULL
                        THEN v_score_scaled >= v_passing_threshold
                    ELSE NULL
                END
            )
            ON CONFLICT (id) DO NOTHING;

            IF FOUND THEN
                v_inserted := v_inserted + 1;
            END IF;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'V122 seed_quiz_attempts: inserted % new quiz_attempts', v_inserted;
END $migration$;

DROP FUNCTION IF EXISTS fn_seed_v122_triangular(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS fn_seed_v122_int(TEXT, INT, INT);
DROP FUNCTION IF EXISTS fn_seed_v122_rand(TEXT);

DO $verify$
DECLARE
    v_total       BIGINT;
    v_students    BIGINT;
    v_quizzes     BIGINT;
    v_p50         DOUBLE PRECISION;
    v_p95         DOUBLE PRECISION;
    v_orphans     BIGINT;
    v_pass_pct    DOUBLE PRECISION;
BEGIN
    SELECT COUNT(*), COUNT(DISTINCT student_id), COUNT(DISTINCT quiz_id)
    INTO v_total, v_students, v_quizzes
    FROM quiz_attempts;

    SELECT
        ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY score / NULLIF(max_score, 0) * 100)::numeric, 1),
        ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY score / NULLIF(max_score, 0) * 100)::numeric, 1)
    INTO v_p50, v_p95
    FROM quiz_attempts
    WHERE status IN ('SUBMITTED', 'GRADED') AND max_score > 0;

    SELECT COUNT(*)
    INTO v_orphans
    FROM quiz_attempts qa
    LEFT JOIN quizzes q ON q.id = qa.quiz_id
    LEFT JOIN users   u ON u.id = qa.student_id
    WHERE q.id IS NULL OR u.id IS NULL OR u.role <> 'STUDENT';

    SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE is_passed = true) / NULLIF(COUNT(*) FILTER (WHERE is_passed IS NOT NULL), 0), 1)
    INTO v_pass_pct
    FROM quiz_attempts;

    RAISE NOTICE 'V122 verify: total=%, students=%, quizzes=%, p50=%, p95=%, pass_rate=%%%, orphans=%',
        v_total, v_students, v_quizzes, v_p50, v_p95, v_pass_pct, v_orphans;
END $verify$;
