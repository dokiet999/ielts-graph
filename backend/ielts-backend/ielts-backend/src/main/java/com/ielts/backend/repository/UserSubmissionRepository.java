package com.ielts.backend.repository;

import com.ielts.backend.entity.UserSubmission;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserSubmissionRepository extends JpaRepository<UserSubmission, UUID> {

    List<UserSubmission> findByUserIdAndExerciseIdOrderByAttemptNumberDesc(UUID userId, UUID exerciseId);

    Optional<UserSubmission> findTopByUserIdAndExerciseIdOrderByAttemptNumberDesc(UUID userId, UUID exerciseId);

    Optional<UserSubmission> findByIdAndUserId(UUID id, UUID userId);

    @Query("""
            select s from UserSubmission s
            join fetch s.exercise e
            join fetch s.user u
            where s.id = :id
            """)
    Optional<UserSubmission> findByIdWithExerciseAndUser(@Param("id") UUID id);

    @Query("""
            select s from UserSubmission s
            join fetch s.user
            join fetch s.exercise e
            left join fetch e.lesson l
            left join fetch l.section sec
            left join fetch sec.course c
            left join fetch c.teacher
            left join fetch s.gradedBy
            where s.id = :id
            """)
    Optional<UserSubmission> findByIdWithFullCourseHierarchy(@Param("id") UUID id);

    @Query("""
            select s.id as id, s.user.id as userId, e.id as exerciseId,
                   e.skillType as skillType, s.score as score, s.maxScore as maxScore,
                   s.status as status, s.teacherFeedback as teacherFeedback, s.submittedAt as submittedAt
            from UserSubmission s
            join s.exercise e
            join e.lesson l
            join l.section sec
            where sec.course.id = :courseId and l.status = :approvedStatus
            """)
    List<CourseUserSubmissionRow> findCourseSubmissionRows(@Param("courseId") UUID courseId,
                                                           @Param("approvedStatus") ContentStatus approvedStatus);

    @Query("""
            select s from UserSubmission s
            join fetch s.exercise e
            join fetch e.lesson l
            join fetch l.section sec
            left join fetch s.gradedBy
            where sec.course.id = :courseId and s.user.id = :userId
            order by s.submittedAt desc, s.attemptNumber desc
            """)
    List<UserSubmission> findByCourseIdAndUserIdDetailed(@Param("courseId") UUID courseId,
                                                         @Param("userId") UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from UserSubmission s where s.id = :id")
    Optional<UserSubmission> findByIdForUpdate(@Param("id") UUID id);

    /** All submissions of a users with their exercise, lesson and section, newest first. */
    @Query("""
            select s from UserSubmission s
            join fetch s.exercise e
            left join fetch e.lesson l
            left join fetch l.section
            where s.user.id = :userId
            order by s.submittedAt desc, s.attemptNumber desc
            """)
    List<UserSubmission> findByUserIdWithExercise(@Param("userId") UUID userId);

    /** Among the given exercises, those the users has at least one submission with the given status for. */
    @Query("""
            select distinct s.exercise.id from UserSubmission s
            where s.user.id = :userId and s.status = :status and s.exercise.id in :exerciseIds
            """)
    List<UUID> findExerciseIdsWithStatus(@Param("userId") UUID userId,
                                         @Param("exerciseIds") Collection<UUID> exerciseIds,
                                         @Param("status") SubmissionStatus status);

    @Query("""
            select s.id as id, s.exercise.id as exerciseId, s.attemptNumber as attemptNumber,
                   s.score as score, s.status as status
            from UserSubmission s
            where s.user.id = :userId and s.exercise.id in :exerciseIds
            """)
    List<SubmissionScore> findScoresByUserIdAndExerciseIds(@Param("userId") UUID userId,
                                                           @Param("exerciseIds") Collection<UUID> exerciseIds);

    @Query("select count(s) > 0 from UserSubmission s where s.exercise.lesson.id = :lessonId")
    boolean existsByLessonId(@Param("lessonId") UUID lessonId);

    @Query("select count(s) > 0 from UserSubmission s where s.exercise.lesson.section.id = :sectionId")
    boolean existsBySectionId(@Param("sectionId") UUID sectionId);

    @Query("select count(s) > 0 from UserSubmission s where s.exercise.lesson.section.course.id = :courseId")
    boolean existsByCourseId(@Param("courseId") UUID courseId);

    boolean existsByExerciseId(UUID exerciseId);

    long countByExerciseId(UUID exerciseId);

    @Query("""
            select s.exercise.id as exerciseId, count(s) as total
            from UserSubmission s
            where s.exercise.id in :exerciseIds
            group by s.exercise.id
            """)
    List<ExerciseSubmissionCount> countByExerciseIds(@Param("exerciseIds") Collection<UUID> exerciseIds);

    interface ExerciseSubmissionCount {
        UUID getExerciseId();

        long getTotal();
    }

    interface SubmissionScore {
        UUID getId();

        UUID getExerciseId();

        int getAttemptNumber();

        BigDecimal getScore();

        SubmissionStatus getStatus();
    }

    interface CourseUserSubmissionRow {
        UUID getId();

        UUID getUserId();

        UUID getExerciseId();

        SkillType getSkillType();

        BigDecimal getScore();

        BigDecimal getMaxScore();

        SubmissionStatus getStatus();

        String getTeacherFeedback();

        LocalDateTime getSubmittedAt();
    }
}
