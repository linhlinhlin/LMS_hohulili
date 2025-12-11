-- 1. Rename Level 1: Sections -> Chapters
ALTER TABLE public.sections RENAME TO chapters;
ALTER TABLE public.chapters RENAME CONSTRAINT sections_pkey TO chapters_pkey;

-- Rename Foreign Key column in lessons
ALTER TABLE public.lessons RENAME COLUMN section_id TO chapter_id;

-- 2. Create Level 3: Sections (New Entity)
CREATE TABLE public.sections (
    id UUID NOT NULL PRIMARY KEY,
    lesson_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- TEXT, VIDEO, QUIZ
    content TEXT,
    video_url VARCHAR(500),
    duration INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_sections_lesson FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE
);

CREATE INDEX idx_sections_lesson_id ON public.sections(lesson_id);

-- 3. Data Migration: Move Content from Lesson -> Section (Level 3)
-- Only move if there is actual content
INSERT INTO public.sections (id, lesson_id, title, type, content, video_url, duration, order_index, created_at)
SELECT 
    gen_random_uuid(),
    id,
    'Nội dung bài học', -- Default title for the migrated content section
    CASE 
        WHEN video_url IS NOT NULL AND video_url != '' THEN 'VIDEO'
        ELSE 'TEXT' 
    END,
    content,
    video_url,
    COALESCE(duration_minutes, 0),
    0,
    created_at
FROM public.lessons
WHERE (content IS NOT NULL AND content != '') OR (video_url IS NOT NULL AND video_url != '');

-- 4. Cleanup Lessons Table (Level 2 container)
ALTER TABLE public.lessons 
DROP COLUMN content,
DROP COLUMN video_url,
DROP COLUMN duration_minutes;
