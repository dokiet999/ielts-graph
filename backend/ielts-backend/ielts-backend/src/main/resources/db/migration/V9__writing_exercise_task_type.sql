-- ============================================================
-- IELTS Graph - Essay type of the sample Writing exercise
-- Migration: V9__writing_exercise_task_type.sql
-- exercises.content.task holds the QuestionType ID of the essay (ontology v0),
-- which WritingSubmissionServiceImpl passes to the grader.
-- ============================================================

-- The V8 sample asks to "discuss both views and give your own opinion"
UPDATE exercises
SET content = COALESCE(content, '{}'::jsonb) || '{"task": "QT_W2_DISCUSSION"}'::jsonb
WHERE id = '40000000-0000-0000-0000-000000003001';
