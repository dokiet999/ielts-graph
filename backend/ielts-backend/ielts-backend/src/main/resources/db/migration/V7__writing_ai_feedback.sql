-- ============================================================
-- Writing AI Feedback — V7
-- ============================================================

ALTER TABLE user_submissions
    ADD COLUMN ai_structured_feedback JSONB,
    ADD COLUMN ai_model              VARCHAR(100),
    ADD COLUMN ai_prompt_version     VARCHAR(50),
    ADD COLUMN ai_latency_ms         INT;
