package com.ielts.backend.repository;

import com.ielts.backend.entity.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID>, JpaSpecificationExecutor<Exercise> {

    List<Exercise> findByLessonIdOrderByOrderingAsc(UUID lessonId);

    /**
     * Loads the lesson, section and course along with the exercise, so the access
     * check in CourseAccessService runs without extra lazy loads.
     * The lesson is null for standalone practice exercises.
     */
    @Query("""
            select e from Exercise e
            left join fetch e.lesson l
            left join fetch l.section s
            left join fetch s.course
            where e.id = :id
            """)
    Optional<Exercise> findByIdWithLessonAndCourse(@Param("id") UUID id);
}
