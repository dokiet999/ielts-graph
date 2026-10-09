-- ============================================================
-- IELTS Graph - Difficulty level for exercises
-- Migration: V6__add_difficulty_level_to_exercises.sql
-- UC11 / FR-3.01: learners filter practice exercises by skill, level and question type.
-- Existing sample exercises keep NULL until the data team assigns a level.
-- ============================================================

ALTER TABLE exercises ADD COLUMN difficulty_level difficulty_level;

CREATE INDEX idx_exercises_difficulty_level ON exercises (difficulty_level);
