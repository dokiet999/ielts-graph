-- ============================================================
-- IELTS Graph - "IELTS Writing Task 2" course
-- Migration: V11__writing_task2_course.sql
-- Groups the Writing practice exercises (V8 sample + V10 dev prompts) in a course so they show up in the UI.
-- Inside a course the exercises follow the usual access rule: the learner must be enrolled.
-- ============================================================

INSERT INTO courses (id, teacher_id, category_id, title, description, skill_focus, difficulty_level,
                     estimated_duration, is_featured, published_at, is_active, created_at)
VALUES
    ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1',
     'IELTS Writing Task 2', 'Practice IELTS Academic Writing Task 2 essays and get AI feedback per criterion.',
     'WRITING', 'INTERMEDIATE', 2400, FALSE, NOW(), TRUE, NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO sections (id, course_id, title, description, ordering)
VALUES
    ('20000000-0000-0000-0000-000000000091', '10000000-0000-0000-0000-000000000009',
     'Essay practice', 'Task 2 prompts with AI feedback', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lessons (id, section_id, title, lesson_type, video_url, video_duration, document_url, ordering, is_preview)
VALUES
    ('30000000-0000-0000-0000-000000000911', '20000000-0000-0000-0000-000000000091',
     'Task 2 practice prompts', 'DOCUMENT', NULL, NULL, NULL, 1, FALSE)
ON CONFLICT (id) DO NOTHING;

-- V8 sample first, then the V10 dev prompts (their ordering was 101..116)
UPDATE exercises SET lesson_id = '30000000-0000-0000-0000-000000000911', ordering = 1
WHERE id = '40000000-0000-0000-0000-000000003001';

UPDATE exercises SET lesson_id = '30000000-0000-0000-0000-000000000911', ordering = ordering - 99
WHERE title LIKE 'IELTS Writing Task 2 - Dev %' AND lesson_id IS NULL;

-- The demo learner joins the Writing course
INSERT INTO enrollments (id, user_id, course_id)
VALUES ('50000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000011',
        '10000000-0000-0000-0000-000000000009')
ON CONFLICT (user_id, course_id) DO NOTHING;
