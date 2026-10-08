package com.ielts.backend.repository;

import com.ielts.backend.entity.Exercise;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {

    List<Exercise> findByLessonIdOrderByOrderingAsc(UUID lessonId);
}
