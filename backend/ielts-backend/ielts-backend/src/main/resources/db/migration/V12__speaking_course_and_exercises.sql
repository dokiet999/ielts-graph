-- ============================================================
-- IELTS Graph - "IELTS Speaking Practice" course & sample exercises
-- Migration: V12__speaking_course_and_exercises.sql
-- Seeds a Speaking course with Part 1, Part 2, and Part 3 practice exercises.
-- Each exercise stores its part and prompt in exercises.content (e.g. content.part = "QT_S_PART2").
-- ============================================================

INSERT INTO courses (id, teacher_id, category_id, title, description, skill_focus, difficulty_level,
                     estimated_duration, is_featured, published_at, is_active, created_at)
VALUES
    ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1',
     'IELTS Speaking Practice', 'Practice IELTS Speaking Parts 1, 2 and 3 with Whisper speech recognition and AI feedback.',
     'SPEAKING', 'INTERMEDIATE', 1200, FALSE, NOW(), TRUE, NOW() + INTERVAL '1 hour')
ON CONFLICT (id) DO NOTHING;

INSERT INTO sections (id, course_id, title, description, ordering)
VALUES
    ('20000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000010',
     'Speaking practice', 'Parts 1, 2 and 3 prompts with AI speech and rubric evaluation', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lessons (id, section_id, title, lesson_type, video_url, video_duration, document_url, ordering, is_preview)
VALUES
    ('30000000-0000-0000-0000-000000001011', '20000000-0000-0000-0000-000000000101',
     'Speaking Parts 1, 2 & 3 prompts', 'DOCUMENT', NULL, NULL, NULL, 1, FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO exercises (id, lesson_id, title, instruction, exercise_type, skill_type, time_limit, max_attempts, ordering, content)
VALUES
    ('40000000-0000-0000-0000-000000004001', '30000000-0000-0000-0000-000000001011',
     'IELTS Speaking Part 1 - Hometown & Daily Routine',
     'Answer the following Part 1 question in 20 to 45 seconds: Where is your hometown located, and what do you like most about living there?',
     'PRACTICE', 'SPEAKING', 120, 10, 1,
     '{"part": "QT_S_PART1", "prompt": "Where is your hometown located, and what do you like most about living there?"}'::jsonb),
    ('40000000-0000-0000-0000-000000004002', '30000000-0000-0000-0000-000000001011',
     'IELTS Speaking Part 2 - A Memorable Trip',
     'Describe a city or place you visited recently that left a strong impression on you. You should say: where it is, when and with whom you went there, what you did there, and explain why you want to go back there.',
     'PRACTICE', 'SPEAKING', 180, 10, 2,
     '{"part": "QT_S_PART2", "prompt": "Describe a city or place you visited recently that left a strong impression on you. You should say: where it is, when and with whom you went there, what you did there, and explain why you want to go back there."}'::jsonb),
    ('40000000-0000-0000-0000-000000004003', '30000000-0000-0000-0000-000000001011',
     'IELTS Speaking Part 3 - Tourism & Local Culture',
     'Answer the following Part 3 discussion question in 45 to 90 seconds: How does tourism affect local communities, and how can governments balance economic benefits with cultural preservation?',
     'PRACTICE', 'SPEAKING', 180, 10, 3,
     '{"part": "QT_S_PART3", "prompt": "How does tourism affect local communities, and how can governments balance economic benefits with cultural preservation?"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, exercise_id, question_text, question_type, points, ordering)
VALUES
    ('50000000-0000-0000-0000-000000004001', '40000000-0000-0000-0000-000000004001',
     'Where is your hometown located, and what do you like most about living there?',
     'SPEAKING', 9, 1),
    ('50000000-0000-0000-0000-000000004002', '40000000-0000-0000-0000-000000004002',
     'Describe a city or place you visited recently that left a strong impression on you. You should say: where it is, when and with whom you went there, what you did there, and explain why you want to go back there.',
     'SPEAKING', 9, 1),
    ('50000000-0000-0000-0000-000000004003', '40000000-0000-0000-0000-000000004003',
     'How does tourism affect local communities, and how can governments balance economic benefits with cultural preservation?',
     'SPEAKING', 9, 1)
ON CONFLICT (id) DO NOTHING;

-- The demo learner joins the Speaking course
INSERT INTO enrollments (id, user_id, course_id)
VALUES ('50000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000011',
        '10000000-0000-0000-0000-000000000010')
ON CONFLICT (user_id, course_id) DO NOTHING;
