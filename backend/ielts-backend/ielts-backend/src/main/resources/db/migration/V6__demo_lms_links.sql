-- ============================================================
-- IELTS Graph - Link sample exercises to lessons for the LMS demo
-- Migration: V6__demo_lms_links.sql
-- ============================================================

-- Time the learner spent on an attempt, in seconds (sent by the client)
ALTER TABLE user_submissions ADD COLUMN time_spent INT;

-- Reading sample "Farming in the Sky" -> lesson "Skimming and scanning" (Reading course)
UPDATE exercises SET lesson_id = '30000000-0000-0000-0000-000000000112', ordering = 1
WHERE id = 'd9f52c7a-9133-51eb-ad99-e9fef11162b4';

-- Listening sample "Photography Course Enquiry" -> lesson "Listening Part 1" (Listening course).
-- ordering = 0 so it is listed before the V2 placeholder exercise without questions.
UPDATE exercises SET lesson_id = '30000000-0000-0000-0000-000000000211', ordering = 0
WHERE id = 'ad96d65b-5c3a-5057-9e9c-39bb9f76d4ee';

-- The demo learner also joins the Listening course
INSERT INTO enrollments (id, user_id, course_id)
VALUES ('50000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011',
        '10000000-0000-0000-0000-000000000002')
ON CONFLICT (user_id, course_id) DO NOTHING;
