package com.ielts.backend.repository;

import com.ielts.backend.entity.Exercise;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {

    List<Exercise> findByLessonIdOrderByOrderingAsc(UUID lessonId);

    Page<Exercise> findBySkillType(SkillType skillType, Pageable pageable);

    Page<Exercise> findBySkillTypeAndExerciseType(SkillType skillType, ExerciseType exerciseType, Pageable pageable);

    Optional<Exercise> findByIdAndSkillType(UUID id, SkillType skillType);
}
