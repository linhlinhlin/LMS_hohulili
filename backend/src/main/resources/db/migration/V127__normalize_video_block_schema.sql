-- =====================================================================
-- V127: Normalize video block schema cho fresh/staging DB
-- Follow-up của V126 (Codex catch sau khi merge #266).
--
-- Vấn đề: V126 build video block với keys 'url' + 'durationSeconds',
-- nhưng có 2 FE consumers expect keys khác nhau:
--
--   1. video-block.component.ts:66 reads: d.rawUrl || d.url || d.file?.url
--      → 'url' work, nhưng 'rawUrl' standard hơn (block-types.ts:31 doc).
--
--   2. CoursePublicationService.buildSectionResponses:291 reads:
--      data.get("videoUrl") + data.get("duration") trực tiếp
--      → 'url'/'durationSeconds' của V126 → null trong section response
--      → FE lesson player thấy section.videoUrl=null → broken playback.
--
-- Codex đã operationally fix prod SAF-101 bằng cách republish snapshot
-- với aliases. Migration V127 normalize schema source-of-truth cho fresh
-- DB (CI/staging), đảm bảo V126 → V127 stack produce đúng state.
--
-- Operations:
--   1. UPDATE content_blocks JSONB của lesson V126: thêm aliases
--      'videoUrl', 'rawUrl', 'duration' (giữ keys cũ để backward compat).
--   2. Idempotent: jsonb_set với create_missing=true. Re-run = no-op
--      khi keys đã tồn tại đúng giá trị.
--
-- SOTA reference:
--   • Stripe API versioning — additive field aliases for migration safety
--   • PostgreSQL jsonb_set — atomic JSONB key add/update
--
-- Schema impact: UPDATE lessons.content_blocks JSONB only.
-- =====================================================================

DO $migration$
DECLARE
    v_video_asset_id TEXT := 'd2dac2c3-a54c-4cd3-bf5b-f89685d0d603';
    v_lesson_id      UUID := '7b959a5c-25c6-4742-9c5b-c1e20901849c';
    v_video_url      TEXT := 'https://holilihu.online/uploads/videos/f2a2a8a0-f595-45b6-97d3-e22196dc91c6.mp4';
    v_duration_sec   INT  := 1680;
    v_existing_blocks JSONB;
    v_updated_blocks  JSONB;
    v_block_idx INT;
    v_block JSONB;
    v_block_data JSONB;
    v_updated INT;
BEGIN
    -- Verify lesson exists (defensive guard, mirror V126 §1).
    IF NOT EXISTS (
        SELECT 1 FROM lessons l
        JOIN chapters ch ON ch.id = l.chapter_id
        JOIN courses co  ON co.id = ch.course_id
        WHERE l.id = v_lesson_id AND co.code = 'SAF-101'
    ) THEN
        RAISE NOTICE 'V127: target lesson not found in SAF-101, skipping.';
        RETURN;
    END IF;

    SELECT content_blocks INTO v_existing_blocks FROM lessons WHERE id = v_lesson_id;

    IF v_existing_blocks IS NULL OR jsonb_typeof(v_existing_blocks) <> 'array' THEN
        RAISE NOTICE 'V127: content_blocks empty or non-array, skipping.';
        RETURN;
    END IF;

    -- Walk blocks; for video block matching V126 fileId, ensure aliases exist.
    v_updated_blocks := '[]'::jsonb;
    FOR v_block_idx IN 0..jsonb_array_length(v_existing_blocks) - 1 LOOP
        v_block := v_existing_blocks -> v_block_idx;

        IF v_block ->> 'type' = 'video'
           AND v_block -> 'data' ->> 'fileId' = v_video_asset_id THEN
            v_block_data := COALESCE(v_block -> 'data', '{}'::jsonb);

            -- Add aliases (only if missing) to match FE consumers.
            v_block_data := COALESCE(v_block_data, '{}'::jsonb)
                || jsonb_build_object(
                    'videoUrl',  COALESCE(v_block_data ->> 'videoUrl',  v_video_url),
                    'rawUrl',    COALESCE(v_block_data ->> 'rawUrl',    v_video_url),
                    'duration',  COALESCE((v_block_data ->> 'duration')::int, v_duration_sec)
                );

            v_block := jsonb_set(v_block, '{data}', v_block_data, true);
        END IF;

        v_updated_blocks := v_updated_blocks || jsonb_build_array(v_block);
    END LOOP;

    UPDATE lessons
    SET content_blocks = v_updated_blocks,
        updated_at     = NOW()
    WHERE id = v_lesson_id;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE 'V127: lesson updated (rows=%)', v_updated;
END $migration$;

-- Verify block.
DO $verify$
DECLARE
    v_lesson_id UUID := '7b959a5c-25c6-4742-9c5b-c1e20901849c';
    v_video_block JSONB;
    v_has_url BOOLEAN;
    v_has_videoUrl BOOLEAN;
    v_has_rawUrl BOOLEAN;
    v_has_duration BOOLEAN;
    v_has_durationSeconds BOOLEAN;
BEGIN
    SELECT block INTO v_video_block
    FROM lessons l,
         LATERAL jsonb_array_elements(l.content_blocks) block
    WHERE l.id = v_lesson_id
      AND block ->> 'type' = 'video'
    LIMIT 1;

    IF v_video_block IS NULL THEN
        RAISE NOTICE 'V127 verify: no video block found (target lesson may be missing).';
        RETURN;
    END IF;

    v_has_url             := v_video_block -> 'data' ? 'url';
    v_has_videoUrl        := v_video_block -> 'data' ? 'videoUrl';
    v_has_rawUrl          := v_video_block -> 'data' ? 'rawUrl';
    v_has_duration        := v_video_block -> 'data' ? 'duration';
    v_has_durationSeconds := v_video_block -> 'data' ? 'durationSeconds';

    RAISE NOTICE 'V127 verify: url=% videoUrl=% rawUrl=% duration=% durationSeconds=%',
        v_has_url, v_has_videoUrl, v_has_rawUrl, v_has_duration, v_has_durationSeconds;
END $verify$;
