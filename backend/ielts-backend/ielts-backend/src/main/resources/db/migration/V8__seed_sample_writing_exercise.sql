-- ============================================================
-- IELTS Graph - Sample Writing Task 2 Exercise
-- Migration: V8__seed_sample_writing_exercise.sql
-- Standalone practice exercise (lesson_id IS NULL) open to all students
-- ============================================================

INSERT INTO exercises (id, lesson_id, title, instruction, exercise_type, skill_type, time_limit, max_attempts, ordering)
VALUES
    ('40000000-0000-0000-0000-000000003001', NULL,
     'IELTS Writing Task 2 - Technology and Education',
     'You should spend about 40 minutes on this task. Write about the following topic: Some people believe that online learning is more effective than traditional classroom learning, while others disagree. Discuss both views and give your own opinion. Write at least 250 words.',
     'PRACTICE', 'WRITING', 2400, 5, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, exercise_id, question_text, question_type, points, ordering)
VALUES
    ('50000000-0000-0000-0000-000000003001', '40000000-0000-0000-0000-000000003001',
     'Some people believe that online learning is more effective than traditional classroom learning, while others disagree. Discuss both views and give your own opinion.',
     'ESSAY', 9, 1)
ON CONFLICT (id) DO NOTHING;
