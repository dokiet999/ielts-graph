-- ============================================================
-- IELTS Graph - Initial Database Schema
-- Migration: V1__init_schema.sql
-- Database: PostgreSQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

CREATE TYPE difficulty_level AS ENUM ('BEGINNER', 'ELEMENTARY', 'INTERMEDIATE', 'UPPER_INTERMEDIATE', 'ADVANCED');

CREATE TYPE skill_type AS ENUM ('LISTENING', 'READING', 'WRITING', 'SPEAKING');

CREATE TYPE exercise_type AS ENUM ('LESSON', 'MOCK_TEST', 'PRACTICE');

CREATE TYPE question_type AS ENUM (
    'MULTIPLE_CHOICE',
    'DROPLIST',
    'FILL_BLANK',
    'TRUE_FALSE',
    'MATCHING',
    'ESSAY',
    'SPEAKING'
);

CREATE TYPE grading_method AS ENUM ('AI', 'TEACHER');

CREATE TYPE submission_status AS ENUM ('PENDING', 'GRADING', 'GRADED', 'FAILED');

-- ============================================================
-- TABLE: users
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255),
    full_name       VARCHAR(255)    NOT NULL,
    avatar_url      VARCHAR(512),
    role            user_role       NOT NULL DEFAULT 'STUDENT',
    bio             TEXT,
    phone           VARCHAR(20),
    date_of_birth   DATE,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN         NOT NULL DEFAULT FALSE,
    oauth_provider  VARCHAR(50),
    oauth_id        VARCHAR(255),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email      ON users (email);
CREATE INDEX idx_users_role       ON users (role);
CREATE INDEX idx_users_oauth      ON users (oauth_provider, oauth_id);

-- ============================================================
-- TABLE: categories
-- ============================================================

CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255)    NOT NULL,
    slug        VARCHAR(255)    NOT NULL UNIQUE,
    description TEXT,
    icon_url    VARCHAR(512),
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    ordering    INT             NOT NULL DEFAULT 0,
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_slug ON categories (slug);

-- ============================================================
-- TABLE: courses
-- ============================================================

CREATE TABLE courses (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id          UUID            NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    category_id         UUID            REFERENCES categories (id) ON DELETE SET NULL,
    title               VARCHAR(512)    NOT NULL,
    description         TEXT,
    thumbnail           VARCHAR(512),
    skill_focus         skill_type,
    difficulty_level    difficulty_level,
    estimated_duration  INT,
    is_featured         BOOLEAN         NOT NULL DEFAULT FALSE,
    enrollment_count    INT             NOT NULL DEFAULT 0,
    rating              NUMERIC(3, 2)   NOT NULL DEFAULT 0.00,
    course_outline      JSONB,
    published_at        TIMESTAMP,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_courses_teacher_id    ON courses (teacher_id);
CREATE INDEX idx_courses_category_id   ON courses (category_id);
CREATE INDEX idx_courses_skill_focus   ON courses (skill_focus);
CREATE INDEX idx_courses_is_featured   ON courses (is_featured);

-- ============================================================
-- TABLE: sections
-- ============================================================

CREATE TABLE sections (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id   UUID            NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    title       VARCHAR(512)    NOT NULL,
    description TEXT,
    ordering    INT             NOT NULL DEFAULT 0,
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sections_course_id ON sections (course_id);

-- ============================================================
-- TABLE: lessons
-- ============================================================

CREATE TABLE lessons (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id      UUID            NOT NULL REFERENCES sections (id) ON DELETE CASCADE,
    title           VARCHAR(512)    NOT NULL,
    lesson_type     VARCHAR(50)     NOT NULL DEFAULT 'VIDEO',
    video_url       VARCHAR(512),
    video_duration  INT,
    document_url    VARCHAR(512),
    ordering        INT             NOT NULL DEFAULT 0,
    is_preview      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lessons_section_id ON lessons (section_id);

-- ============================================================
-- TABLE: exercises
-- ============================================================

CREATE TABLE exercises (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id        UUID            REFERENCES lessons (id) ON DELETE CASCADE,
    title            VARCHAR(512)    NOT NULL,
    instruction      TEXT,
    audio_url        VARCHAR(512),
    content          JSONB,
    exercise_type    exercise_type   NOT NULL DEFAULT 'LESSON',
    skill_type       skill_type      NOT NULL,
    time_limit       INT,
    max_attempts     INT             NOT NULL DEFAULT 1,
    passing_score    NUMERIC(5, 2)   NOT NULL DEFAULT 0.00,
    ordering         INT             NOT NULL DEFAULT 0,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exercises_lesson_id     ON exercises (lesson_id);
CREATE INDEX idx_exercises_skill_type    ON exercises (skill_type);
CREATE INDEX idx_exercises_exercise_type ON exercises (exercise_type);

-- ============================================================
-- TABLE: question_groups
-- ============================================================

CREATE TABLE question_groups (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_id           UUID            NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
    group_title           VARCHAR(512),
    group_instruction     TEXT,
    passage_reference     TEXT,
    image_url             VARCHAR(512),
    question_type         question_type,
    question_range        VARCHAR(50),
    correct_answer_count  INT             NOT NULL DEFAULT 0,
    ordering              INT             NOT NULL DEFAULT 0,
    created_at            TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_groups_exercise_id ON question_groups (exercise_id);

-- ============================================================
-- TABLE: questions
-- ============================================================

CREATE TABLE questions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exercise_id       UUID            NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
    question_group_id UUID            REFERENCES question_groups (id) ON DELETE SET NULL,
    question_text     TEXT            NOT NULL,
    question_type     question_type   NOT NULL,
    image_url         VARCHAR(512),
    audio_url         VARCHAR(512),
    reading_passage   TEXT,
    explanation       TEXT,
    points            NUMERIC(5, 2)   NOT NULL DEFAULT 1.00,
    ordering          INT             NOT NULL DEFAULT 0,
    created_at        TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_exercise_id       ON questions (exercise_id);
CREATE INDEX idx_questions_question_group_id ON questions (question_group_id);
CREATE INDEX idx_questions_question_type     ON questions (question_type);

-- ============================================================
-- TABLE: question_options
-- ============================================================

CREATE TABLE question_options (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID            NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    option_text TEXT            NOT NULL,
    is_correct  BOOLEAN         NOT NULL DEFAULT FALSE,
    point       NUMERIC(5, 2)   NOT NULL DEFAULT 0.00,
    explanation TEXT,
    ordering    INT             NOT NULL DEFAULT 0,
    created_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_options_question_id ON question_options (question_id);
CREATE INDEX idx_question_options_is_correct  ON question_options (question_id, is_correct);

-- ============================================================
-- TABLE: user_submissions  (Submission)
-- ============================================================

CREATE TABLE user_submissions (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID                NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    exercise_id      UUID                NOT NULL REFERENCES exercises (id) ON DELETE CASCADE,
    attempt_number   INT                 NOT NULL DEFAULT 1,
    answers          JSONB,
    score            NUMERIC(5, 2)       NOT NULL DEFAULT 0.00,
    max_score        NUMERIC(5, 2)       NOT NULL DEFAULT 0.00,
    ai_score         NUMERIC(5, 2),
    ai_feedback      TEXT,
    teacher_score    NUMERIC(5, 2),
    teacher_feedback TEXT,
    grading_method   grading_method,
    graded_by        UUID                REFERENCES users (id) ON DELETE SET NULL,
    graded_at        TIMESTAMP,
    status           submission_status   NOT NULL DEFAULT 'PENDING',
    submitted_at     TIMESTAMP           NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMP           NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP           NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_submission_attempt UNIQUE (user_id, exercise_id, attempt_number)
);

CREATE INDEX idx_user_submissions_user_id     ON user_submissions (user_id);
CREATE INDEX idx_user_submissions_exercise_id ON user_submissions (exercise_id);
CREATE INDEX idx_user_submissions_status      ON user_submissions (status);
CREATE INDEX idx_user_submissions_graded_by   ON user_submissions (graded_by);

-- ============================================================
-- TABLE: question_answers  (Submission Answer)
-- ============================================================

CREATE TABLE question_answers (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id    UUID            NOT NULL REFERENCES user_submissions (id) ON DELETE CASCADE,
    question_id      UUID            NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    answer_text      TEXT,
    selected_options UUID[],
    media_url        VARCHAR(512),
    is_correct       BOOLEAN,
    points_earned    NUMERIC(5, 2)   NOT NULL DEFAULT 0.00,
    ai_points        NUMERIC(5, 2),
    ai_feedback      TEXT,
    teacher_points   NUMERIC(5, 2),
    teacher_feedback TEXT,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_question_answers_submission_id ON question_answers (submission_id);
CREATE INDEX idx_question_answers_question_id   ON question_answers (question_id);

-- ============================================================
-- TABLE: enrollments
-- ============================================================

CREATE TABLE enrollments (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id           UUID            NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    enrollment_date     TIMESTAMP       NOT NULL DEFAULT NOW(),
    completion_date     TIMESTAMP,
    progress_percentage NUMERIC(5, 2)   NOT NULL DEFAULT 0.00,
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_enrollment UNIQUE (user_id, course_id)
);

CREATE INDEX idx_enrollments_user_id   ON enrollments (user_id);
CREATE INDEX idx_enrollments_course_id ON enrollments (course_id);

-- ============================================================
-- TRIGGER: auto-update updated_at on every table
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'users', 'categories', 'courses', 'sections', 'lessons',
        'exercises', 'question_groups', 'questions', 'question_options',
        'user_submissions', 'question_answers', 'enrollments'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();',
            tbl, tbl
        );
    END LOOP;
END;
$$;
