package com.ielts.backend.service.progress;

import com.ielts.backend.entity.Enrollment;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.repository.EnrollmentRepository;
import com.ielts.backend.repository.ExerciseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Keeps {@code enrollments.progress_percentage} and {@code completion_date} aligned with
 * the course exercises a learner has graded submissions for.
 */
@Service
@RequiredArgsConstructor
public class EnrollmentProgressSyncService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final ExerciseRepository exerciseRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LearningProgressReader learningProgressReader;

    @Transactional
    public void syncForUserAndExercise(UUID userId, UUID exerciseId) {
        if (userId == null || exerciseId == null) {
            return;
        }
        Exercise exercise = exerciseRepository.findByIdWithLessonAndCourse(exerciseId).orElse(null);
        if (exercise == null || exercise.getLesson() == null) {
            return;
        }
        UUID courseId = exercise.getLesson().getSection().getCourse().getId();
        Enrollment enrollment = enrollmentRepository.findByUserIdAndCourseIdAndIsActiveTrue(userId, courseId)
                .orElse(null);
        if (enrollment == null) {
            return;
        }

        ExerciseCounts counts = learningProgressReader.countExercises(List.of(courseId), userId);
        int total = counts.total(courseId);
        int completed = counts.completed(courseId);

        BigDecimal percentage = total <= 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(completed)
                        .multiply(HUNDRED)
                        .divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP);
        enrollment.setProgressPercentage(percentage);
        if (total > 0 && completed >= total && enrollment.getCompletionDate() == null) {
            enrollment.setCompletionDate(LocalDateTime.now());
        }
        enrollmentRepository.save(enrollment);
    }
}
