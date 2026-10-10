package com.ielts.backend.repository;

import com.ielts.backend.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SectionRepository extends JpaRepository<Section, UUID> {

    List<Section> findByCourseIdOrderByOrderingAsc(UUID courseId);

    @Query("select s from Section s join fetch s.course c join fetch c.teacher where s.id = :id")
    Optional<Section> findByIdWithCourse(@Param("id") UUID id);

    @Query("""
            select s.course.id as courseId, count(s) as total
            from Section s
            where s.course.id in :courseIds
            group by s.course.id
            """)
    List<CourseSectionCount> countByCourseIds(@Param("courseIds") Collection<UUID> courseIds);

    interface CourseSectionCount {
        UUID getCourseId();

        long getTotal();
    }
}
