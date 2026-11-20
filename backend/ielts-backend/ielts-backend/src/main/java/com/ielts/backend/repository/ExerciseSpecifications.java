package com.ielts.backend.repository;

import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Lesson;
import com.ielts.backend.entity.Section;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

public final class ExerciseSpecifications {

    private ExerciseSpecifications() {
    }

    public static Specification<Exercise> visible() {
        return (root, query, cb) -> {
            Join<Exercise, Lesson> lesson = root.join("lesson", JoinType.LEFT);
            Join<Lesson, Section> section = lesson.join("section", JoinType.LEFT);
            Join<Section, Course> course = section.join("course", JoinType.LEFT);
            return cb.or(
                    cb.isNull(root.get("lesson")),
                    cb.and(
                            cb.equal(lesson.get("status"), ContentStatus.APPROVED),
                            cb.isTrue(course.get("isActive")),
                            cb.isNotNull(course.get("publishedAt"))));
        };
    }

    public static Specification<Exercise> hasSkill(SkillType skill) {
        return skill == null ? null : (root, query, cb) -> cb.equal(root.get("skillType"), skill);
    }

    public static Specification<Exercise> hasType(ExerciseType type) {
        return type == null ? null : (root, query, cb) -> cb.equal(root.get("exerciseType"), type);
    }
}

