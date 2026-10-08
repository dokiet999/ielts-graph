package com.ielts.backend.repository;

import com.ielts.backend.entity.Course;
import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.SkillType;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

/**
 * Building blocks for course search. Filter methods return null when the
 * filter is not set, so callers can drop them before combining.
 */
public final class CourseSpecifications {

    private CourseSpecifications() {
    }

    public static Specification<Course> visible() {
        return (root, query, cb) -> cb.and(
                cb.isTrue(root.get("isActive")),
                cb.isNotNull(root.get("publishedAt")));
    }

    public static Specification<Course> hasSkill(SkillType skill) {
        return skill == null ? null : (root, query, cb) -> cb.equal(root.get("skillFocus"), skill);
    }

    public static Specification<Course> inCategory(UUID categoryId) {
        return categoryId == null ? null : (root, query, cb) -> cb.equal(root.get("category").get("id"), categoryId);
    }

    public static Specification<Course> hasLevel(DifficultyLevel level) {
        return level == null ? null : (root, query, cb) -> cb.equal(root.get("difficultyLevel"), level);
    }

    public static Specification<Course> titleContains(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String pattern = "%" + escapeLike(keyword.trim().toLowerCase()) + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("title")), pattern, '\\');
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
