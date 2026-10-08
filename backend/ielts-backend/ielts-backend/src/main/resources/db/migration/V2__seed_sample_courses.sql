-- ============================================================
-- IELTS Graph - Sample courses / sections / lessons for W2 demo
-- Migration: V2__seed_sample_courses.sql
-- Fixed UUIDs so the data can be referenced from tests and Swagger.
-- ============================================================

-- Teacher (no password yet: login is not implemented)
INSERT INTO users (id, email, full_name, role, is_active, email_verified)
VALUES ('00000000-0000-0000-0000-000000000001', 'teacher.demo@ielts-graph.local', 'Demo Teacher', 'TEACHER', TRUE, TRUE);

INSERT INTO categories (id, name, slug, description, ordering)
VALUES
    ('00000000-0000-0000-0000-0000000000c1', 'Academic', 'academic', 'IELTS Academic preparation', 1),
    ('00000000-0000-0000-0000-0000000000c2', 'General Training', 'general-training', 'IELTS General Training preparation', 2);

-- ------------------------------------------------------------
-- Courses: 2 active, 1 inactive (must not appear in the API)
-- ------------------------------------------------------------
INSERT INTO courses (id, teacher_id, category_id, title, description, skill_focus, difficulty_level,
                     estimated_duration, is_featured, published_at, is_active, created_at)
VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1',
     'IELTS Reading Foundations', 'Core strategies for the IELTS Academic Reading test.',
     'READING', 'INTERMEDIATE', 600, TRUE, NOW(), TRUE, NOW() - INTERVAL '2 days'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1',
     'IELTS Listening Essentials', 'Understand the four parts of the Listening test.',
     'LISTENING', 'ELEMENTARY', 480, FALSE, NOW(), TRUE, NOW() - INTERVAL '1 day'),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', NULL,
     'Draft Writing Course', 'Unpublished course used to verify filtering.',
     'WRITING', 'ADVANCED', 300, FALSE, NULL, FALSE, NOW());

-- ------------------------------------------------------------
-- Sections
-- ------------------------------------------------------------
INSERT INTO sections (id, course_id, title, description, ordering)
VALUES
    ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'Getting started', 'Test format and skimming/scanning', 1),
    ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'Question types', 'Strategies per question type', 2),
    ('20000000-0000-0000-0000-000000000021', '10000000-0000-0000-0000-000000000002', 'Listening basics', 'Parts 1 and 2', 1),
    ('20000000-0000-0000-0000-000000000031', '10000000-0000-0000-0000-000000000003', 'Draft section', NULL, 1);

-- ------------------------------------------------------------
-- Lessons (ordering inserted out of order on purpose)
-- ------------------------------------------------------------
INSERT INTO lessons (id, section_id, title, lesson_type, video_url, video_duration, document_url, ordering, is_preview)
VALUES
    ('30000000-0000-0000-0000-000000000112', '20000000-0000-0000-0000-000000000011', 'Skimming and scanning', 'VIDEO',
     'https://example.com/videos/reading-skimming.mp4', 720, NULL, 2, FALSE),
    ('30000000-0000-0000-0000-000000000111', '20000000-0000-0000-0000-000000000011', 'Introduction to IELTS Reading', 'VIDEO',
     'https://example.com/videos/reading-intro.mp4', 540, 'https://example.com/docs/reading-intro.pdf', 1, TRUE),
    ('30000000-0000-0000-0000-000000000121', '20000000-0000-0000-0000-000000000012', 'True / False / Not Given', 'DOCUMENT',
     NULL, NULL, 'https://example.com/docs/tfng.pdf', 1, FALSE),
    ('30000000-0000-0000-0000-000000000122', '20000000-0000-0000-0000-000000000012', 'Matching headings', 'VIDEO',
     'https://example.com/videos/matching-headings.mp4', 900, NULL, 2, FALSE),
    ('30000000-0000-0000-0000-000000000211', '20000000-0000-0000-0000-000000000021', 'Listening Part 1: form completion', 'VIDEO',
     'https://example.com/videos/listening-part1.mp4', 600, NULL, 1, TRUE),
    ('30000000-0000-0000-0000-000000000311', '20000000-0000-0000-0000-000000000031', 'Draft lesson', 'VIDEO',
     NULL, NULL, NULL, 1, FALSE);

-- ------------------------------------------------------------
-- Exercises attached to lessons (questions are seeded with #3/#4)
-- ------------------------------------------------------------
INSERT INTO exercises (id, lesson_id, title, instruction, exercise_type, skill_type, time_limit, max_attempts, ordering)
VALUES
    ('40000000-0000-0000-0000-000000001211', '30000000-0000-0000-0000-000000000121', 'TFNG practice 1',
     'Do the following statements agree with the information in the passage?', 'PRACTICE', 'READING', 900, 99, 1),
    ('40000000-0000-0000-0000-000000001212', '30000000-0000-0000-0000-000000000121', 'TFNG practice 2',
     'Do the following statements agree with the information in the passage?', 'PRACTICE', 'READING', 900, 99, 2),
    ('40000000-0000-0000-0000-000000002111', '30000000-0000-0000-0000-000000000211', 'Form completion practice',
     'Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER.', 'PRACTICE', 'LISTENING', 600, 99, 1);
