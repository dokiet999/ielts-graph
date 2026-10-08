package com.ielts.backend.repository;

import com.ielts.backend.entity.Course;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

/**
 * A course is visible to learners when it is active and published
 * (is_active = true AND published_at IS NOT NULL).
 */
public interface CourseRepository extends JpaRepository<Course, UUID>, JpaSpecificationExecutor<Course> {

    @Override
    @EntityGraph(attributePaths = {"teacher", "category"})
    Page<Course> findAll(Specification<Course> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"teacher", "category"})
    Optional<Course> findByIdAndIsActiveTrueAndPublishedAtIsNotNull(UUID id);

    boolean existsByIdAndIsActiveTrueAndPublishedAtIsNotNull(UUID id);
}
