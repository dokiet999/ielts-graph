package com.ielts.backend.repository;

import com.ielts.backend.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SectionRepository extends JpaRepository<Section, UUID> {

    List<Section> findByCourseIdOrderByOrderingAsc(UUID courseId);
}
