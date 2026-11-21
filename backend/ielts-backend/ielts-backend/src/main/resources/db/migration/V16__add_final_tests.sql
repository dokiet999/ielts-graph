-- ============================================================
-- V16: Add FINAL_TEST enum value & tables for Final Test Grants and Sessions
-- Note: PostgreSQL requires committing a new enum value before using it in INSERTs (see V17).
-- ============================================================

ALTER TYPE exercise_type ADD VALUE IF NOT EXISTS 'FINAL_TEST';

CREATE TABLE IF NOT EXISTS final_test_grants (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    section_id    UUID NOT NULL REFERENCES sections (id) ON DELETE CASCADE,
    unlocked_by   UUID REFERENCES users (id) ON DELETE SET NULL,
    deadline_days INT NOT NULL DEFAULT 7,
    unlocked_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMP NOT NULL,
    CONSTRAINT uq_final_test_grant UNIQUE (user_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_final_test_grants_user_section ON final_test_grants (user_id, section_id);

CREATE TABLE IF NOT EXISTS final_test_sessions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    exercise_id   UUID NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
    section_id    UUID NOT NULL REFERENCES sections (id) ON DELETE CASCADE,
    started_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMP NOT NULL,
    submitted_at  TIMESTAMP,
    submission_id UUID REFERENCES user_submissions (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_final_test_sessions_user_sec ON final_test_sessions (user_id, section_id);
