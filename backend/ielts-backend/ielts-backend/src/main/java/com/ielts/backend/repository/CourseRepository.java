package com.ielts.backend.repository;

import com.ielts.backend.entity.Course;
import com.ielts.backend.enums.SkillType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CourseRepository extends JpaRepository<Course, UUID> {

    @EntityGraph(attributePaths = {"teacher", "category"})
    Page<Course> findByIsActiveTrue(Pageable pageable);

    @EntityGraph(attributePaths = {"teacher", "category"})
    Page<Course> findByIsActiveTrueAndSkillFocus(SkillType skillFocus, Pageable pageable);

    @EntityGraph(attributePaths = {"teacher", "category"})
    Optional<Course> findByIdAndIsActiveTrue(UUID id);

    boolean existsByIdAndIsActiveTrue(UUID id);
}
