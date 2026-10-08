-- ============================================================
-- IELTS Graph - Demo accounts, enrollment and a draft course
-- Migration: V4__seed_demo_accounts.sql
-- All demo accounts use the password "Demo@123" (BCrypt hash below).
-- ============================================================

-- Existing teacher from V2 gets a password
UPDATE users
SET password_hash = '$2b$10$oDH6KhuZ2JPesajjCVMMl.LhkaVALuPEZgPlgylb.LhQacfOY2eCa'
WHERE id = '00000000-0000-0000-0000-000000000001';

INSERT INTO users (id, username, email, password_hash, full_name, role, status, is_active, email_verified)
VALUES
    ('00000000-0000-0000-0000-000000000002', 'teacher_other', 'teacher.other@ielts-graph.local',
     '$2b$10$oDH6KhuZ2JPesajjCVMMl.LhkaVALuPEZgPlgylb.LhQacfOY2eCa', 'Other Teacher', 'TEACHER', 'ACTIVE', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000003', 'admin_demo', 'admin.demo@ielts-graph.local',
     '$2b$10$oDH6KhuZ2JPesajjCVMMl.LhkaVALuPEZgPlgylb.LhQacfOY2eCa', 'Demo Admin', 'ADMIN', 'ACTIVE', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000011', 'student_enrolled', 'student.enrolled@ielts-graph.local',
     '$2b$10$oDH6KhuZ2JPesajjCVMMl.LhkaVALuPEZgPlgylb.LhQacfOY2eCa', 'Enrolled Student', 'STUDENT', 'ACTIVE', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000012', 'student_new', 'student.new@ielts-graph.local',
     '$2b$10$oDH6KhuZ2JPesajjCVMMl.LhkaVALuPEZgPlgylb.LhQacfOY2eCa', 'New Student', 'STUDENT', 'ACTIVE', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000013', 'student_locked', 'student.locked@ielts-graph.local',
     '$2b$10$oDH6KhuZ2JPesajjCVMMl.LhkaVALuPEZgPlgylb.LhQacfOY2eCa', 'Locked Student', 'STUDENT', 'LOCKED', FALSE, TRUE),
    ('00000000-0000-0000-0000-000000000004', 'teacher_pending', 'teacher.pending@ielts-graph.local',
     '$2b$10$oDH6KhuZ2JPesajjCVMMl.LhkaVALuPEZgPlgylb.LhQacfOY2eCa', 'Pending Teacher', 'TEACHER', 'PENDING', FALSE, TRUE);

-- student_enrolled has joined the Reading course
INSERT INTO enrollments (id, user_id, course_id)
VALUES ('50000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011',
        '10000000-0000-0000-0000-000000000001');

-- ------------------------------------------------------------
-- Draft course: active but not yet published (published_at IS NULL).
-- Must stay invisible to learners, including its preview lesson.
-- ------------------------------------------------------------
INSERT INTO courses (id, teacher_id, category_id, title, description, skill_focus, difficulty_level,
                     estimated_duration, published_at, is_active)
VALUES ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-0000000000c2', 'Draft Speaking Course', 'Not published yet.',
        'SPEAKING', 'INTERMEDIATE', 240, NULL, TRUE);

INSERT INTO sections (id, course_id, title, ordering)
VALUES ('20000000-0000-0000-0000-000000000041', '10000000-0000-0000-0000-000000000004', 'Draft section', 1);

INSERT INTO lessons (id, section_id, title, lesson_type, video_url, ordering, is_preview)
VALUES ('30000000-0000-0000-0000-000000000411', '20000000-0000-0000-0000-000000000041', 'Draft preview lesson',
        'VIDEO', 'https://example.com/videos/draft.mp4', 1, TRUE);
