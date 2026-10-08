package com.ielts.backend.service;

import com.ielts.backend.entity.Exercise;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.exception.ForbiddenException;
import com.ielts.backend.exception.UnauthorizedException;
import com.ielts.backend.repository.ExerciseRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Exercise access rules that #3/#4 rely on (FR-2.01). */
@SpringBootTest
@Transactional
class CourseAccessServiceTest {

    private static final UUID TFNG_EXERCISE = UUID.fromString("40000000-0000-0000-0000-000000001211");

    @Autowired
    CourseAccessService courseAccessService;

    @Autowired
    ExerciseRepository exerciseRepository;

    private Exercise lessonExercise() {
        return exerciseRepository.findById(TFNG_EXERCISE).orElseThrow();
    }

    @Test
    void lessonExercise_enrolledStudent_allowed() {
        assertThatCode(() -> courseAccessService.checkExerciseAccess(lessonExercise(), "student_enrolled"))
                .doesNotThrowAnyException();
    }

    @Test
    void lessonExercise_notEnrolled_forbidden() {
        assertThatThrownBy(() -> courseAccessService.checkExerciseAccess(lessonExercise(), "student_new"))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void lessonExercise_anonymous_unauthorized() {
        assertThatThrownBy(() -> courseAccessService.checkExerciseAccess(lessonExercise(), null))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void standalonePracticeExercise_isOpenToEveryone() {
        Exercise practice = exerciseRepository.save(Exercise.builder()
                .title("Standalone practice")
                .skillType(SkillType.READING)
                .build());

        assertThatCode(() -> courseAccessService.checkExerciseAccess(practice, null)).doesNotThrowAnyException();
        assertThatCode(() -> courseAccessService.checkExerciseAccess(practice, "student_new")).doesNotThrowAnyException();
    }
}
