-- Clear a production SAF-101 thumbnail URL whose CDN object no longer exists.
-- Frontend cards now also fall back on image load failures, but this keeps API data honest.
DO $$
DECLARE
    v_broken_thumbnail TEXT := 'https://cdn.holilihu.online/course-thumbnails/8e4d91c4-4a0d-4f7c-be34-6b44f26f2b30.png';
BEGIN
    UPDATE courses
    SET thumbnail_url = NULL
    WHERE code = 'SAF-101'
      AND thumbnail_url = v_broken_thumbnail;

    UPDATE course_publications cp
    SET snapshot = jsonb_set(cp.snapshot, '{detail,thumbnailUrl}', 'null'::jsonb, true)
    FROM courses c
    WHERE cp.course_id = c.id
      AND c.code = 'SAF-101'
      AND cp.snapshot #>> '{detail,thumbnailUrl}' = v_broken_thumbnail;
END $$;
