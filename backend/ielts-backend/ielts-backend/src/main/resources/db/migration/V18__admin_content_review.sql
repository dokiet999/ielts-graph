-- ============================================================
-- IELTS Graph - Admin content moderation & teacher lock reason
-- Migration: V18__admin_content_review.sql
-- ============================================================

-- Content moderation: DRAFT -> PENDING_REVIEW -> APPROVED | REJECTED
ALTER TABLE courses
    ADD COLUMN status        VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')),
    ADD COLUMN submitted_at  TIMESTAMP,
    ADD COLUMN reviewed_at   TIMESTAMP,
    ADD COLUMN reviewed_by   UUID REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN review_note   TEXT;

ALTER TABLE lessons
    ADD COLUMN status        VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED')),
    ADD COLUMN submitted_at  TIMESTAMP,
    ADD COLUMN reviewed_at   TIMESTAMP,
    ADD COLUMN reviewed_by   UUID REFERENCES users (id) ON DELETE SET NULL,
    ADD COLUMN review_note   TEXT;

ALTER TABLE users
    ADD COLUMN lock_reason   TEXT;

-- Backfill: already-published courses and their lessons are APPROVED;
-- unpublished/draft courses and their lessons stay DRAFT.
UPDATE courses
SET status      = 'APPROVED',
    reviewed_at = published_at
WHERE published_at IS NOT NULL;

UPDATE lessons l
SET status      = 'APPROVED',
    reviewed_at = c.published_at
FROM sections s
JOIN courses c ON c.id = s.course_id
WHERE l.section_id = s.id
  AND c.published_at IS NOT NULL;

CREATE INDEX idx_courses_status_submitted ON courses (status, submitted_at);
CREATE INDEX idx_lessons_status_submitted ON lessons (status, submitted_at);

