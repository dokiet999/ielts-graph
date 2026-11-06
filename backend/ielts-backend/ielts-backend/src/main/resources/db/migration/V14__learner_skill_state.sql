-- ============================================================
-- Migration: V14__learner_skill_state.sql
-- Purpose: Store learner SubSkill mastery state (W6, Issue 2)
--          and mark submissions whose events have been applied.
-- ============================================================

CREATE TABLE learner_skill_state (
    user_id     UUID             NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    subskill_id VARCHAR(64)      NOT NULL,
    mastery     DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    evidence    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    last_update TIMESTAMP,
    PRIMARY KEY (user_id, subskill_id)
);

CREATE INDEX idx_learner_skill_state_user_id ON learner_skill_state (user_id);

ALTER TABLE user_submissions
    ADD COLUMN profile_applied_at TIMESTAMP NULL;

