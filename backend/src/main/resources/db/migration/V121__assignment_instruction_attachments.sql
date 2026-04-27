-- V121: Reuse assignment_attachments cho teacher instruction attachments.
--
-- Semantic:
--   submission_id IS NULL     => teacher uploaded file dính kèm assignment
--                                (hướng dẫn, đề bài, rubric, sample output...)
--   submission_id IS NOT NULL => student uploaded file dính kèm submission
--
-- Pattern Google Classroom + Canvas: instructions có thể là rich text inline
-- VÀ standalone file attachments. FE/Controller filter qua `submission_id`.

ALTER TABLE assignment_attachments
    ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

-- Partial index tối ưu hóa "list instruction attachments của assignment X".
-- WHERE clause filter ngay tại index level → query nhanh + index nhỏ.
CREATE INDEX IF NOT EXISTS idx_assignment_attach_instruction
    ON assignment_attachments (assignment_id, display_order)
    WHERE submission_id IS NULL;

COMMENT ON COLUMN assignment_attachments.submission_id IS
    'NULL => teacher instruction attachment (assignment-level). NOT NULL => student submission attachment.';
COMMENT ON COLUMN assignment_attachments.display_order IS
    'UI ordering (asc) cho instruction attachments. Auto-assign khi insert nếu null.';
