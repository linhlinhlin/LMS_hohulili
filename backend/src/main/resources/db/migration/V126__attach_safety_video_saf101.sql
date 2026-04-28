-- =====================================================================
-- V126: Attach 720MB safety video to SAF-101 lesson
-- Closes #266 (linhlinhlin/LMS_hohulili)
--
-- Subject override (PO confirmation 2026-04-28): video về "an toàn
-- hàng hải" → SAF-101 thay vì NAV-101 như Codex spec ban đầu.
--
-- Target lesson: SAF-101 chapter 1 (Cứu sinh) lesson order 2
-- "Sống còn trên biển" (Survival at sea) — chủ đề broadest fit cho
-- video tổng quan an toàn hàng hải 28 phút.
--
-- Operations:
--   1. UPDATE lesson: video_url + lesson_type=VIDEO + is_free=true (preview)
--      + duration_minutes=28 + prepend video block vào content_blocks JSONB
--   2. SEED video_progress (~8 rows) cho enrolled SAF-101 students với
--      long-tail position distribution (Netflix watch-history pattern).
--
-- Asset:
--   - File ID:  d2dac2c3-a54c-4cd3-bf5b-f89685d0d603
--   - URL:      https://holilihu.online/uploads/videos/f2a2a8a0-f595-45b6-97d3-e22196dc91c6.mp4
--   - Duration: ~28 phút (1680 giây)
--
-- SOTA reference:
--   • Netflix — viewing activity history + resume position UX
--   • YouTube — watch history as engagement signal
--   • Coursera — video lecture as course progress item
--
-- Idempotent: UPDATE WHERE id = stable UUID, video_progress UNIQUE
-- (student_id, section_id) → ON CONFLICT DO NOTHING.
-- =====================================================================

-- §1: Attach video to lesson "Sống còn trên biển" (SAF-101 ch.0 ord.2)
DO $section1$
DECLARE
    v_lesson_id     UUID := '7b959a5c-25c6-4742-9c5b-c1e20901849c';
    v_video_url     TEXT := 'https://holilihu.online/uploads/videos/f2a2a8a0-f595-45b6-97d3-e22196dc91c6.mp4';
    v_video_asset_id TEXT := 'd2dac2c3-a54c-4cd3-bf5b-f89685d0d603';
    v_video_block   JSONB;
    v_existing_blocks JSONB;
    v_updated INT;
BEGIN
    -- Verify lesson exists and belongs to SAF-101 (defensive guard).
    IF NOT EXISTS (
        SELECT 1 FROM lessons l
        JOIN chapters ch ON ch.id = l.chapter_id
        JOIN courses co  ON co.id = ch.course_id
        WHERE l.id = v_lesson_id AND co.code = 'SAF-101'
    ) THEN
        RAISE NOTICE 'V126 §1: target lesson not found in SAF-101, skipping.';
        RETURN;
    END IF;

    -- Build video block matching content_blocks JSONB schema.
    v_video_block := jsonb_build_object(
        'id',   md5('video:v126:' || v_lesson_id::text),
        'type', 'video',
        'data', jsonb_build_object(
            'url',             v_video_url,
            'fileId',          v_video_asset_id,
            'videoAssetId',    v_video_asset_id,
            'durationSeconds', 1680,
            'title',           'Sống còn trên biển — Bài giảng video chính thức',
            'caption',         'Video huấn luyện an toàn hàng hải 28 phút theo chuẩn STCW Basic Safety Training.',
            'sourceKind',      'UPLOADED'
        )
    );

    -- Preserve V125 rich text block, prepend video block.
    SELECT COALESCE(content_blocks, '[]'::jsonb)
    INTO v_existing_blocks
    FROM lessons WHERE id = v_lesson_id;

    UPDATE lessons
    SET video_url        = v_video_url,
        lesson_type      = 'VIDEO',
        is_free          = true,
        duration_minutes = 28,
        content_blocks   = jsonb_build_array(v_video_block) || v_existing_blocks,
        updated_at       = NOW()
    WHERE id = v_lesson_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'V126 §1: lesson updated (rows=%)', v_updated;
END $section1$;

-- §2: Seed video_progress với long-tail position distribution.
DO $section2$
DECLARE
    v_lesson_id      UUID := '7b959a5c-25c6-4742-9c5b-c1e20901849c';
    v_video_asset_id TEXT := 'd2dac2c3-a54c-4cd3-bf5b-f89685d0d603';
    v_section_id     TEXT := 'lesson:' || v_lesson_id::text || ':video:' || v_video_asset_id;
    v_duration_sec   INT  := 1680;
    v_student RECORD;
    v_seed TEXT;
    v_position_pct DOUBLE PRECISION;
    v_completed BOOLEAN;
    v_position_roll INT;
    v_inserted INT := 0;
BEGIN
    -- Pick top 8 SAF-101 enrolled students (deterministic order).
    FOR v_student IN
        SELECT DISTINCT e.student_id,
               ROW_NUMBER() OVER (ORDER BY md5(e.student_id::text)) AS rnk
        FROM enrollments e
        JOIN learning_classes lc ON lc.id = e.class_id
        JOIN courses co          ON co.id = lc.course_id
        WHERE co.code = 'SAF-101' AND e.status = 'ACTIVE'
        ORDER BY rnk
        LIMIT 8
    LOOP
        v_seed := v_student.student_id::text || ':v126';

        -- Long-tail position distribution per Netflix viewing pattern:
        -- 25% completed (100%), 50% mid-progress (15-80%), 25% just-started (1-14%).
        v_position_roll := (('x' || substring(md5(v_seed || ':pos') FROM 1 FOR 8))::bit(32)::bigint % 100);
        IF v_position_roll < 25 THEN
            v_position_pct := 100.0;
            v_completed := true;
        ELSIF v_position_roll < 75 THEN
            v_position_pct := 15.0 + (('x' || substring(md5(v_seed || ':mid') FROM 1 FOR 8))::bit(32)::bigint % 66)::double precision;
            v_completed := false;
        ELSE
            v_position_pct := 1.0 + (('x' || substring(md5(v_seed || ':early') FROM 1 FOR 8))::bit(32)::bigint % 14)::double precision;
            v_completed := false;
        END IF;

        INSERT INTO video_progress (
            student_id, lesson_id, section_id, duration_seconds,
            watched_seconds, progress_percent, completed, last_position,
            created_at, updated_at
        ) VALUES (
            v_student.student_id, v_lesson_id, v_section_id, v_duration_sec,
            ((v_position_pct / 100.0) * v_duration_sec)::int,
            v_position_pct,
            v_completed,
            (v_position_pct / 100.0) * v_duration_sec,
            NOW() - (((('x' || substring(md5(v_seed || ':ca') FROM 1 FOR 8))::bit(32)::bigint % 30) + 1)::text || ' days')::interval,
            NOW() - (((('x' || substring(md5(v_seed || ':ua') FROM 1 FOR 8))::bit(32)::bigint % 7))::text || ' days')::interval
        )
        ON CONFLICT (student_id, section_id) DO NOTHING;

        IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END LOOP;

    RAISE NOTICE 'V126 §2: video_progress inserted=%', v_inserted;
END $section2$;

-- Verify block.
DO $verify$
DECLARE
    v_lesson_with_asset INT;
    v_lesson_with_url INT;
    v_progress_rows INT;
    v_invalid_progress INT;
    v_lesson_video_url TEXT;
    v_lesson_type TEXT;
    v_lesson_is_free BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO v_lesson_with_asset
    FROM lessons l
    JOIN chapters ch ON ch.id = l.chapter_id
    JOIN courses c   ON c.id  = ch.course_id
    WHERE c.code = 'SAF-101'
      AND l.content_blocks::text LIKE '%d2dac2c3-a54c-4cd3-bf5b-f89685d0d603%';

    SELECT COUNT(*) INTO v_lesson_with_url
    FROM lessons l
    JOIN chapters ch ON ch.id = l.chapter_id
    JOIN courses c   ON c.id  = ch.course_id
    WHERE c.code = 'SAF-101'
      AND l.content_blocks::text LIKE '%f2a2a8a0-f595-45b6-97d3-e22196dc91c6.mp4%';

    SELECT COUNT(*) INTO v_progress_rows
    FROM video_progress vp
    JOIN lessons l ON l.id = vp.lesson_id
    JOIN chapters ch ON ch.id = l.chapter_id
    JOIN courses c   ON c.id  = ch.course_id
    WHERE c.code = 'SAF-101'
      AND vp.section_id LIKE '%d2dac2c3-a54c-4cd3-bf5b-f89685d0d603%';

    SELECT COUNT(*) INTO v_invalid_progress
    FROM video_progress
    WHERE progress_percent < 0 OR progress_percent > 100
       OR last_position < 0 OR watched_seconds > duration_seconds;

    SELECT video_url, lesson_type, is_free INTO v_lesson_video_url, v_lesson_type, v_lesson_is_free
    FROM lessons WHERE id = '7b959a5c-25c6-4742-9c5b-c1e20901849c';

    RAISE NOTICE 'V126 verify: lesson_with_asset=% (expect 1), lesson_with_url=% (expect 1), progress_rows=% (expect ≥5), invalid_progress=% (expect 0), lesson_type=%, is_free=%, video_url=%',
        v_lesson_with_asset, v_lesson_with_url, v_progress_rows, v_invalid_progress,
        v_lesson_type, v_lesson_is_free, v_lesson_video_url;
END $verify$;
