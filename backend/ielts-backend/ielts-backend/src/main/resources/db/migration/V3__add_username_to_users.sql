-- ============================================================
-- IELTS Graph - Login by username + password, account status
-- Migration: V3__add_username_to_users.sql
-- ============================================================

-- Usernames are stored in lower case, so "Student_A" and "student_a" cannot both exist
ALTER TABLE users ADD COLUMN username VARCHAR(50);

UPDATE users SET username = 'teacher_demo' WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE users SET username = 'user_' || replace(id::text, '-', '') WHERE username IS NULL;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT uq_users_username UNIQUE (username);
ALTER TABLE users ADD CONSTRAINT chk_users_username_lower CHECK (username = lower(username));

-- FR-1.02 / FR-7.01: PENDING = teacher waiting for admin approval, LOCKED = blocked by admin
ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('PENDING', 'ACTIVE', 'LOCKED'));

UPDATE users SET status = 'LOCKED' WHERE is_active = FALSE;

CREATE INDEX idx_users_status ON users (status);
