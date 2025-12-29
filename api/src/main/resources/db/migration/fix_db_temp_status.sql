-- 1. Xóa ràng buộc cũ đang bị thiếu giá trị
ALTER TABLE public.file_attachments 
DROP CONSTRAINT IF EXISTS file_attachments_status_check;

-- 2. Tạo lại ràng buộc mới đã bổ sung giá trị 'TEMP'
ALTER TABLE public.file_attachments 
ADD CONSTRAINT file_attachments_status_check 
CHECK (status::text = ANY (ARRAY['UPLOADING'::text, 'AVAILABLE'::text, 'DELETED'::text, 'TEMP'::text]));

-- Kiểm tra lại
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'file_attachments_status_check';
