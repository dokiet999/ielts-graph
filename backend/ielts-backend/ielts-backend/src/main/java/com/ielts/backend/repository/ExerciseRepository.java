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

    List<Exercise> findByLessonIdAndExerciseTypeNotOrderByOrderingAsc(UUID lessonId, ExerciseType excludedType);

    List<Exercise> findByLessonIdAndExerciseTypeNotInOrderByOrderingAsc(UUID lessonId, Collection<ExerciseType> excludedTypes);

    Page<Exercise> findBySkillType(SkillType skillType, Pageable pageable);

    Page<Exercise> findByExerciseType(ExerciseType exerciseType, Pageable pageable);

    Page<Exercise> findBySkillTypeAndExerciseType(SkillType skillType, ExerciseType exerciseType, Pageable pageable);

    Optional<Exercise> findByIdAndSkillType(UUID id, SkillType skillType);

    /** Exercises of every lesson in a section, except mock/final tests, ordered by lesson then exercise. */
    default List<Exercise> findBySectionIdOrdered(UUID sectionId) {
        return findBySectionIdExcludingTypes(sectionId, ExerciseType.TEST_TYPES);
    }

    @Query("""
            select e from Exercise e
            join fetch e.lesson l
            join fetch l.section s
            where s.id = :sectionId and e.exerciseType not in :excludedTypes
            order by l.ordering asc, e.ordering asc
            """)
    List<Exercise> findBySectionIdExcludingTypes(@Param("sectionId") UUID sectionId,
                                                 @Param("excludedTypes") Collection<ExerciseType> excludedTypes);

    @Query("""
            select e from Exercise e
            join fetch e.lesson l
            join fetch l.section s
            where s.id = :sectionId and e.exerciseType = :exerciseType
            order by l.ordering asc, e.ordering asc
            """)
    List<Exercise> findBySectionIdAndType(@Param("sectionId") UUID sectionId,
                                          @Param("exerciseType") ExerciseType exerciseType);

    @Query("""
            select e from Exercise e
            join fetch e.lesson l
            join fetch l.section s
            where s.course.id = :courseId and e.exerciseType = :exerciseType
            order by s.ordering asc, l.ordering asc, e.ordering asc
            """)
    List<Exercise> findByCourseIdAndType(@Param("courseId") UUID courseId,
                                         @Param("exerciseType") ExerciseType exerciseType);

    /**
     * Exercises that count towards course progress: inside a lesson of one of the courses,
     * with at least one question, and not a mock or final test.
     */
    default List<CountableExercise> findCountableByCourseIds(Collection<UUID> courseIds) {
        return findCountableByCourseIdsExcludingTypes(courseIds, ExerciseType.TEST_TYPES);
    }

    @Query("""
            select e.id as exerciseId, l.id as lessonId, s.id as sectionId, s.course.id as courseId
            from Exercise e
            join e.lesson l
            join l.section s
            where s.course.id in :courseIds
              and e.exerciseType not in :excludedTypes
              and exists (select q.id from Question q where q.exercise = e)
            """)
    List<CountableExercise> findCountableByCourseIdsExcludingTypes(@Param("courseIds") Collection<UUID> courseIds,
                                                                   @Param("excludedTypes") Collection<ExerciseType> excludedTypes);

    interface CountableExercise {
        UUID getExerciseId();

        UUID getLessonId();

        UUID getSectionId();

        UUID getCourseId();
    }
}
