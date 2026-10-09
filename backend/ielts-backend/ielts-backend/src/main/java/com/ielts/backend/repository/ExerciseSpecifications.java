package com.ielts.backend.repository;

import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Question;
import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.QuestionType;
import com.ielts.backend.enums.SkillType;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

/**
 * Building blocks for practice exercise search (UC11, FR-3.01). Filter methods
 * return null when the filter is not set, so callers can drop them before combining.
 */
public final class ExerciseSpecifications {

    private ExerciseSpecifications() {
    }

    /**
     * Practice exercises that do not belong to a lesson. Lesson exercises are listed
     * in the lesson detail, and mock tests have their own module (UC17).
     */
    public static Specification<Exercise> standalonePractice() {
        return (root, query, cb) -> cb.and(
                cb.isNull(root.get("lesson")),
                cb.notEqual(root.get("exerciseType"), ExerciseType.MOCK_TEST));
    }

    public static Specification<Exercise> hasSkill(SkillType skill) {
        return skill == null ? null : (root, query, cb) -> cb.equal(root.get("skillType"), skill);
    }

    public static Specification<Exercise> hasLevel(DifficultyLevel level) {
        return level == null ? null : (root, query, cb) -> cb.equal(root.get("difficultyLevel"), level);
    }

    /** Exercises with at least one question of the given type. */
    public static Specification<Exercise> hasQuestionType(QuestionType questionType) {
        if (questionType == null) {
            return null;
        }
        return (root, query, cb) -> {
            Subquery<Integer> sub = query.subquery(Integer.class);
            Root<Question> question = sub.from(Question.class);
            sub.select(cb.literal(1)).where(
                    cb.equal(question.get("exercise"), root),
                    cb.equal(question.get("questionType"), questionType));
            return cb.exists(sub);
        };
    }

    public static Specification<Exercise> titleContains(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String pattern = "%" + CourseSpecifications.escapeLike(keyword.trim().toLowerCase()) + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("title")), pattern, '\\');
    }
}
