package com.ielts.backend.repository;

import com.ielts.backend.entity.Lesson;
import com.ielts.backend.entity.Users;
import com.ielts.backend.enums.ContentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
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

    default List<Lesson> findApprovedByCourseIdOrdered(UUID courseId) {
        return findByCourseIdAndStatusOrdered(courseId, ContentStatus.APPROVED);
    }

    @Query("""
            select l from Lesson l
            join fetch l.section s
            where s.course.id = :courseId and l.status = :status
            order by s.ordering asc, l.ordering asc
            """)
    List<Lesson> findByCourseIdAndStatusOrdered(@Param("courseId") UUID courseId,
                                                @Param("status") ContentStatus status);

    default Optional<Lesson> findVisibleByIdWithSectionAndCourse(UUID id) {
        return findVisibleByIdWithSectionAndCourse(id, ContentStatus.APPROVED);
    }

    @Query("""
            select l from Lesson l
            join fetch l.section s
            join fetch s.course c
            where l.id = :id and c.isActive = true and c.publishedAt is not null and l.status = :status
            """)
    Optional<Lesson> findVisibleByIdWithSectionAndCourse(@Param("id") UUID id,
                                                         @Param("status") ContentStatus status);

    @Query("""
            select l from Lesson l
            join fetch l.section s
            join fetch s.course c
            join fetch c.teacher
            left join fetch l.reviewedBy
            where l.id = :id
            """)
    Optional<Lesson> findByIdWithSectionAndCourse(@Param("id") UUID id);

    @Query(value = """
            select l from Lesson l
            join fetch l.section s
            join fetch s.course c
            join fetch c.teacher
            where l.status = :status and c.status = :courseStatus
            order by case when l.submittedAt is null then 1 else 0 end asc,
                     l.submittedAt asc, l.createdAt asc, l.id asc
            """,
            countQuery = """
            select count(l) from Lesson l
            join l.section s
            join s.course c
            where l.status = :status and c.status = :courseStatus
            """)
    Page<Lesson> findReviewQueueForApprovedCourses(@Param("status") ContentStatus status,
                                                   @Param("courseStatus") ContentStatus courseStatus,
                                                   Pageable pageable);

    @Query("""
            select s.course.id as courseId, count(l) as total
            from Lesson l
            join l.section s
            where s.course.id in :courseIds and l.status = :status
            group by s.course.id
            """)
    List<CourseLessonCount> countByCourseIdsAndStatus(@Param("courseIds") Collection<UUID> courseIds,
                                                      @Param("status") ContentStatus status);

    @Query("""
            select s.course.id as courseId, count(l) as total
            from Lesson l
            join l.section s
            where s.course.id in :courseIds
            group by s.course.id
            """)
    List<CourseLessonCount> countByCourseIds(@Param("courseIds") Collection<UUID> courseIds);

    long countBySectionCourseId(UUID courseId);

    List<Lesson> findBySectionIdOrderByOrderingAsc(UUID sectionId);

    boolean existsBySectionIdAndStatusIn(UUID sectionId, Collection<ContentStatus> statuses);

    @Query("select coalesce(max(l.ordering), 0) from Lesson l where l.section.id = :sectionId")
    int findMaxOrderingBySectionId(@Param("sectionId") UUID sectionId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Lesson l
            set l.status = :newStatus,
                l.submittedAt = null,
                l.reviewedAt = null,
                l.reviewedBy = null,
                l.reviewNote = null
            where l.id = :id and l.status = :expectedStatus
            """)
    int withdrawIfPending(@Param("id") UUID id,
                          @Param("expectedStatus") ContentStatus expectedStatus,
                          @Param("newStatus") ContentStatus newStatus);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Lesson l
            set l.status = :newStatus,
                l.submittedAt = null,
                l.reviewedAt = null,
                l.reviewedBy = null,
                l.reviewNote = null
            where l.section.id in (select s.id from Section s where s.course.id = :courseId)
              and l.status = :expectedStatus
            """)
    int withdrawCourseLessonsIfPending(@Param("courseId") UUID courseId,
                                         @Param("expectedStatus") ContentStatus expectedStatus,
                                         @Param("newStatus") ContentStatus newStatus);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Lesson l
            set l.status = :newStatus,
                l.submittedAt = :now,
                l.reviewedAt = null,
                l.reviewedBy = null,
                l.reviewNote = null
            where l.id = :id and l.status in :allowedStatuses
            """)
    int submitIfAllowed(@Param("id") UUID id,
                        @Param("allowedStatuses") Collection<ContentStatus> allowedStatuses,
                        @Param("newStatus") ContentStatus newStatus,
                        @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Lesson l
            set l.status = :newStatus,
                l.submittedAt = :now,
                l.reviewedAt = null,
                l.reviewedBy = null,
                l.reviewNote = null
            where l.section.id in (select s.id from Section s where s.course.id = :courseId)
              and l.status in :allowedStatuses
            """)
    int submitCourseLessonsIfAllowed(@Param("courseId") UUID courseId,
                                     @Param("allowedStatuses") Collection<ContentStatus> allowedStatuses,
                                     @Param("newStatus") ContentStatus newStatus,
                                     @Param("now") LocalDateTime now);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Lesson l
            set l.status = :newStatus,
                l.reviewedAt = :now,
                l.reviewedBy = :reviewer,
                l.reviewNote = :note
            where l.id = :id and l.status = :expectedStatus
            """)
    int updateStatusIfPending(@Param("id") UUID id,
                              @Param("expectedStatus") ContentStatus expectedStatus,
                              @Param("newStatus") ContentStatus newStatus,
                              @Param("now") LocalDateTime now,
                              @Param("reviewer") Users reviewer,
                              @Param("note") String note);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Lesson l
            set l.status = :newStatus,
                l.reviewedAt = :now,
                l.reviewedBy = :reviewer,
                l.reviewNote = :note
            where l.section.id in (select s.id from Section s where s.course.id = :courseId)
              and l.status = :expectedStatus
            """)
    int updateBundledLessonsDecision(@Param("courseId") UUID courseId,
                                     @Param("expectedStatus") ContentStatus expectedStatus,
                                     @Param("newStatus") ContentStatus newStatus,
                                     @Param("now") LocalDateTime now,
                                     @Param("reviewer") Users reviewer,
                                     @Param("note") String note);

    interface CourseLessonCount {
        UUID getCourseId();

        long getTotal();
    }
}
