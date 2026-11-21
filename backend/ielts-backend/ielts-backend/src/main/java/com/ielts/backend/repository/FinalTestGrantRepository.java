package com.ielts.backend.repository;

import com.ielts.backend.entity.FinalTestGrant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface FinalTestGrantRepository extends JpaRepository<FinalTestGrant, UUID> {

    Optional<FinalTestGrant> findByUserIdAndSectionId(UUID userId, UUID sectionId);

    void deleteByUserIdAndSectionId(UUID userId, UUID sectionId);

    /**
     * Number of grants of the learner, still valid at {@code now}, on any section of the course. A final test
     * can belong to the whole course (see LessonServiceImpl.findFinalTestOfSection), so a grant on any of its
     * sections unlocks it.
     */
    @Query("""
            select count(g) from FinalTestGrant g, Section s
            where s.id = g.sectionId and s.course.id = :courseId
              and g.userId = :userId and g.expiresAt > :now
            """)
    long countValidInCourse(@Param("userId") UUID userId,
                            @Param("courseId") UUID courseId,
                            @Param("now") LocalDateTime now);
}
