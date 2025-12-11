-- Fix assignment_type values to uppercase to match Java enum
UPDATE assignments SET assignment_type = 'FILE_SUBMISSION' WHERE assignment_type = 'file_submission';
UPDATE assignments SET assignment_type = 'ESSAY' WHERE assignment_type = 'essay';
UPDATE assignments SET assignment_type = 'QUIZ' WHERE assignment_type = 'quiz';
UPDATE assignments SET assignment_type = 'PROGRAMMING' WHERE assignment_type = 'programming';
UPDATE assignments SET assignment_type = 'PROJECT' WHERE assignment_type = 'project';
