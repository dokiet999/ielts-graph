package com.ielts.backend.repository;

import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Users;
import com.ielts.backend.enums.ContentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
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

    @EntityGraph(attributePaths = {"teacher", "category", "reviewedBy"})
    Optional<Course> findWithDetailsById(UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Course c where c.id = :id")
    Optional<Course> findByIdForUpdate(@Param("id") UUID id);

    @EntityGraph(attributePaths = {"teacher", "category"})
    @Query("""
            select c from Course c
            where c.status = :status
            order by case when c.submittedAt is null then 1 else 0 end asc,
                     c.submittedAt asc, c.createdAt asc, c.id asc
            """)
    Page<Course> findReviewQueueByStatus(@Param("status") ContentStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"teacher", "category"})
    Page<Course> findByTeacherId(UUID teacherId, Pageable pageable);

    @EntityGraph(attributePaths = {"teacher", "category"})
    Page<Course> findByTeacherIdAndStatus(UUID teacherId, ContentStatus status, Pageable pageable);

    long countByCategoryId(UUID categoryId);

    @Query("""
            select c.category.id as categoryId, count(c) as total
            from Course c
            where c.category.id in :categoryIds
            group by c.category.id
            """)
    List<CategoryCourseCount> countByCategoryIds(@Param("categoryIds") Collection<UUID> categoryIds);

    long countByTeacherId(UUID teacherId);

    @Query("""
            select c.teacher.id as teacherId, count(c) as total
            from Course c
            where c.teacher.id in :teacherIds
            group by c.teacher.id
            """)
    List<TeacherCourseCount> countByTeacherIds(@Param("teacherIds") Collection<UUID> teacherIds);

    interface CategoryCourseCount {
        UUID getCategoryId();

        long getTotal();
    }

    interface TeacherCourseCount {
        UUID getTeacherId();

        long getTotal();
    }

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Course c
            set c.status = :newStatus,
                c.submittedAt = null,
                c.reviewedAt = null,
                c.reviewedBy = null,
                c.reviewNote = null
            where c.id = :id and c.status = :expectedStatus
            """)
    int withdrawIfPending(@Param("id") UUID id,
                          @Param("expectedStatus") ContentStatus expectedStatus,
                          @Param("newStatus") ContentStatus newStatus);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Course c
            set c.status = :newStatus,
                c.submittedAt = :now,
                c.reviewedAt = null,
                c.reviewedBy = null,
                c.reviewNote = null
            where c.id = :id and c.status in :allowedStatuses
            """)
    int submitIfAllowed(@Param("id") UUID id,
                        @Param("allowedStatuses") Collection<ContentStatus> allowedStatuses,
                        @Param("newStatus") ContentStatus newStatus,
                        @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Course c
            set c.status = :newStatus,
                c.publishedAt = coalesce(c.publishedAt, :now),
                c.reviewedAt = :now,
                c.reviewedBy = :reviewer,
                c.reviewNote = :note
            where c.id = :id and c.status = :expectedStatus
            """)
    int approveIfPending(@Param("id") UUID id,
                         @Param("expectedStatus") ContentStatus expectedStatus,
                         @Param("newStatus") ContentStatus newStatus,
                         @Param("now") LocalDateTime now,
                         @Param("reviewer") Users reviewer,
                         @Param("note") String note);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Course c
            set c.status = :newStatus,
                c.reviewedAt = :now,
                c.reviewedBy = :reviewer,
                c.reviewNote = :reason
            where c.id = :id and c.status = :expectedStatus
            """)
    int rejectIfPending(@Param("id") UUID id,
                        @Param("expectedStatus") ContentStatus expectedStatus,
                        @Param("newStatus") ContentStatus newStatus,
                        @Param("now") LocalDateTime now,
                        @Param("reviewer") Users reviewer,
                        @Param("reason") String reason);
}
