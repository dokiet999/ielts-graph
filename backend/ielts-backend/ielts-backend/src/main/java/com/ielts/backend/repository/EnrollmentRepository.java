package com.ielts.backend.repository;

import com.ielts.backend.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    Optional<Enrollment> findByUserIdAndCourseId(UUID userId, UUID courseId);

    boolean existsByCourseId(UUID courseId);

    boolean existsByUserIdAndCourseIdAndIsActiveTrue(UUID userId, UUID courseId);

    /**
     * Race-safe insert: two concurrent requests for the same users/course
     * cannot violate uq_enrollment. Returns 1 when inserted, 0 when it already existed.
     */
    @Modifying
    @Query(value = """
            INSERT INTO enrollments (user_id, course_id)
            VALUES (:userId, :courseId)
            ON CONFLICT (user_id, course_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("userId") UUID userId, @Param("courseId") UUID courseId);

    long countByCourseIdAndIsActiveTrue(UUID courseId);

    long countByUserIdAndIsActiveTrue(UUID userId);

    Optional<Enrollment> findByUserIdAndCourseIdAndIsActiveTrue(UUID userId, UUID courseId);

    @Query("""
            select e from Enrollment e
            join fetch e.user u
            where e.course.id = :courseId and e.isActive = true
            order by e.enrollmentDate desc, u.fullName asc
            """)
    List<Enrollment> findActiveWithUserByCourseId(@Param("courseId") UUID courseId);

    @Query("""
            select e from Enrollment e
            join fetch e.user u
            where e.course.id = :courseId and e.user.id = :userId and e.isActive = true
            """)
    Optional<Enrollment> findActiveWithUserByCourseIdAndUserId(@Param("courseId") UUID courseId,
                                                               @Param("userId") UUID userId);

    @Query("""
            select e.user.id as userId, count(e) as total
            from Enrollment e
            where e.user.id in :userIds and e.isActive = true
            group by e.user.id
            """)
    List<UserEnrollmentCount> countActiveByUserIds(@Param("userIds") Collection<UUID> userIds);

    /** Active enrollments of a users in visible (active and published) courses, newest first. */
    @Query("""
            select e from Enrollment e
            join fetch e.course c
            join fetch c.teacher
            left join fetch c.category
            where e.user.id = :userId and e.isActive = true
              and c.isActive = true and c.publishedAt is not null
            order by e.enrollmentDate desc, c.id asc
            """)
    List<Enrollment> findActiveInVisibleCoursesByUserId(@Param("userId") UUID userId);

    @Query("""
            select e.course.id as courseId, count(e) as total
            from Enrollment e
            where e.course.id in :courseIds and e.isActive = true
            group by e.course.id
            """)
    List<CourseEnrollmentCount> countActiveByCourseIds(@Param("courseIds") Collection<UUID> courseIds);

    interface CourseEnrollmentCount {
        UUID getCourseId();

        long getTotal();
    }

    interface UserEnrollmentCount {
        UUID getUserId();

        long getTotal();
    }
}
