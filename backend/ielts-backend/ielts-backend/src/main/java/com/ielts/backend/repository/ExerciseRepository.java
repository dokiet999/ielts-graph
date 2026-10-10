package com.ielts.backend.repository;

import com.ielts.backend.entity.Exercise;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {

    List<Exercise> findByLessonIdOrderByOrderingAsc(UUID lessonId);

    Page<Exercise> findBySkillType(SkillType skillType, Pageable pageable);

    Page<Exercise> findBySkillTypeAndExerciseType(SkillType skillType, ExerciseType exerciseType, Pageable pageable);

    Optional<Exercise> findByIdAndSkillType(UUID id, SkillType skillType);

    /** Exercises of every lesson in a section, except mock tests, ordered by lesson then exercise. */
    default List<Exercise> findBySectionIdOrdered(UUID sectionId) {
        return findBySectionIdExcludingType(sectionId, ExerciseType.MOCK_TEST);
    }

    @Query("""
            select e from Exercise e
            join fetch e.lesson l
            join fetch l.section s
            where s.id = :sectionId and e.exerciseType <> :excludedType
            order by l.ordering asc, e.ordering asc
            """)
    List<Exercise> findBySectionIdExcludingType(@Param("sectionId") UUID sectionId,
                                                @Param("excludedType") ExerciseType excludedType);

    /**
     * Exercises that count towards course progress: inside a lesson of one of the courses,
     * with at least one question, and not a mock test.
     */
    default List<CountableExercise> findCountableByCourseIds(Collection<UUID> courseIds) {
        return findCountableByCourseIdsExcludingType(courseIds, ExerciseType.MOCK_TEST);
    }

    @Query("""
            select e.id as exerciseId, l.id as lessonId, s.id as sectionId, s.course.id as courseId
            from Exercise e
            join e.lesson l
            join l.section s
            where s.course.id in :courseIds
              and e.exerciseType <> :excludedType
              and exists (select q.id from Question q where q.exercise = e)
            """)
    List<CountableExercise> findCountableByCourseIdsExcludingType(@Param("courseIds") Collection<UUID> courseIds,
                                                                  @Param("excludedType") ExerciseType excludedType);

    interface CountableExercise {
        UUID getExerciseId();

        UUID getLessonId();

        UUID getSectionId();

        UUID getCourseId();
    }
}
