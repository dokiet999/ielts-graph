-- ============================================================
-- IELTS Graph - Admin course deactivation reason
-- Migration: V19__course_deactivation_reason.sql
-- ============================================================

ALTER TABLE courses
    ADD COLUMN deactivation_reason TEXT;
