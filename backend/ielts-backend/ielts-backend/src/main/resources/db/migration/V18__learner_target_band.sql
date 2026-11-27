-- ============================================================
-- Migration: V18__learner_target_band.sql
-- Purpose: Target band chosen by the learner for each AI-graded skill
--          (W7, personalization tab). The gap between the current
--          band of each criterion and this target ranks the weaknesses.
-- ============================================================

CREATE TABLE learner_target_band (
    user_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    skill_type  VARCHAR(16)  NOT NULL CHECK (skill_type IN ('WRITING', 'SPEAKING')),
    target_band NUMERIC(2, 1) NOT NULL CHECK (target_band BETWEEN 4.0 AND 9.0),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, skill_type)
);
