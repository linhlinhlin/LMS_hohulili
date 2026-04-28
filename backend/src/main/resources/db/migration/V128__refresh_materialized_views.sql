-- =====================================================================
-- V128: One-time REFRESH MATERIALIZED VIEW after V122-V127 seed migrations
-- Closes #275 (linhlinhlin/LMS_hohulili)
--
-- Vấn đề: mv_course_stats + mv_teacher_performance được tạo từ migration
-- cũ và chưa có scheduler refresh định kỳ. Sau V122-V127 seed, MVs vẫn
-- show data cũ (NAV-101: MV=12 enrollments, realtime=18).
--
-- Fix immediate: REFRESH CONCURRENTLY cả 2 MVs.
-- Fix long-term: MaterializedViewRefreshScheduler.java (cùng PR) chạy
-- @Scheduled fixedDelay=30min để tự refresh.
--
-- REFRESH CONCURRENTLY:
--   - Yêu cầu UNIQUE INDEX trên MV (đã verified: idx_mv_course_stats_id,
--     idx_mv_teacher_perf_id).
--   - KHÔNG lock SELECT readers — production-safe.
--   - Overhead: ~5-15s per MV. Migration sẽ tổng ~10-30s.
-- =====================================================================

REFRESH MATERIALIZED VIEW CONCURRENTLY mv_course_stats;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_teacher_performance;

DO $verify$
DECLARE
    v_nav101_mv_enrolls INT;
    v_nav101_realtime INT;
    v_saf101_mv_enrolls INT;
    v_saf101_realtime INT;
BEGIN
    SELECT total_enrollments INTO v_nav101_mv_enrolls
    FROM mv_course_stats
    WHERE course_id = (SELECT id FROM courses WHERE code = 'NAV-101');

    SELECT COUNT(*)::int INTO v_nav101_realtime
    FROM enrollments e
    JOIN learning_classes lc ON lc.id = e.class_id
    WHERE lc.course_id = (SELECT id FROM courses WHERE code = 'NAV-101');

    SELECT total_enrollments INTO v_saf101_mv_enrolls
    FROM mv_course_stats
    WHERE course_id = (SELECT id FROM courses WHERE code = 'SAF-101');

    SELECT COUNT(*)::int INTO v_saf101_realtime
    FROM enrollments e
    JOIN learning_classes lc ON lc.id = e.class_id
    WHERE lc.course_id = (SELECT id FROM courses WHERE code = 'SAF-101');

    RAISE NOTICE 'V128 verify: NAV-101 mv=% realtime=% (% match), SAF-101 mv=% realtime=% (% match)',
        v_nav101_mv_enrolls, v_nav101_realtime,
        CASE WHEN v_nav101_mv_enrolls = v_nav101_realtime THEN '✓' ELSE '✗' END,
        v_saf101_mv_enrolls, v_saf101_realtime,
        CASE WHEN v_saf101_mv_enrolls = v_saf101_realtime THEN '✓' ELSE '✗' END;
END $verify$;
