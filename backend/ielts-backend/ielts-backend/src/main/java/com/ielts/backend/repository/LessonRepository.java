package com.ielts.backend.repository;

import com.ielts.backend.entity.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LessonRepository extends JpaRepository<Lesson, UUID> {

    @Query("""
            select l from Lesson l
            join fetch l.section s
            where s.course.id = :courseId
            order by s.ordering asc, l.ordering asc
            """)
    List<Lesson> findAllByCourseIdOrdered(@Param("courseId") UUID courseId);

    @Query("""
            select l from Lesson l
            join fetch l.section s
            join fetch s.course c
            where l.id = :id and c.isActive = true
            """)
    Optional<Lesson> findActiveByIdWithSectionAndCourse(@Param("id") UUID id);
}
