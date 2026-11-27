ALTER TABLE courses
    ADD COLUMN max_students INT NULL,
    ADD COLUMN start_date TIMESTAMP NULL,
    ADD COLUMN end_date TIMESTAMP NULL,
    ADD CONSTRAINT chk_courses_max_students_positive CHECK (max_students IS NULL OR max_students > 0),
    ADD CONSTRAINT chk_courses_date_range CHECK (start_date IS NULL OR end_date IS NULL OR end_date > start_date);
