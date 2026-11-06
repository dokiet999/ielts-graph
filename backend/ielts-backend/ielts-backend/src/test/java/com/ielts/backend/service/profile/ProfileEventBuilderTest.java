package com.ielts.backend.service.profile;

import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.User;
import com.ielts.backend.entity.UserSubmission;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.service.kg.KgGraphClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfileEventBuilderTest {

    private static final UUID USER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID EXERCISE_ID = UUID.fromString("60000000-0000-0000-0000-000000000001");

    @Mock
    private KgGraphClient kgGraphClient;

    private ProfileEventBuilder builder;
    private User user;

    @BeforeEach
    void setUp() {
        builder = new ProfileEventBuilder(kgGraphClient);
        user = User.builder().id(USER_ID).email("student@test.local").fullName("Student").build();
    }

    @Test
    void buildEvents_writingTask2_createsOneErrorPerAffectedSubSkill_andCleanOnlyForGradedCriteria() {
        Exercise exercise = Exercise.builder()
                .id(EXERCISE_ID)
                .skillType(SkillType.WRITING)
                .exerciseType(ExerciseType.PRACTICE)
                .build();

        // Writing Task 2 grades TR, CC, LR, GRA (does NOT grade CRIT_W_TA)
        Map<String, Object> criteria = new LinkedHashMap<>();
        criteria.put("CRIT_W_TR", Map.of("band", 6, "evidence", List.of()));
        criteria.put("CRIT_W_CC", Map.of("band", 6, "evidence", List.of()));
        criteria.put("CRIT_W_LR", Map.of("band", 7, "evidence", List.of()));
        criteria.put("CRIT_W_GRA", Map.of(
                "band", 6,
                "evidence", List.of(
                        Map.of("quote", "Student can learn", "error_type", "ERR_ARTICLE"),
                        Map.of("quote", "Teacher can teach", "error_type", "ERR_ARTICLE")
                )
        ));

        UserSubmission submission = UserSubmission.builder()
                .id(UUID.randomUUID())
                .user(user)
                .exercise(exercise)
                .status(SubmissionStatus.GRADED)
                .gradedAt(LocalDateTime.of(2026, 10, 20, 14, 30))
                .aiStructuredFeedback(Map.of("criteria", criteria))
                .build();

        when(kgGraphClient.findPracticedSubSkills("exercises:" + EXERCISE_ID)).thenReturn(List.of());
        when(kgGraphClient.findAffectedSubSkills(eq("SKILL_W"), eq(List.of("ERR_ARTICLE"))))
                .thenReturn(List.of("SUB_ARTICLE"));
        when(kgGraphClient.findSubSkillsByCriteria(List.of("CRIT_W_TR", "CRIT_W_CC", "CRIT_W_LR", "CRIT_W_GRA")))
                .thenReturn(List.of("SUB_ARTICLE", "SUB_COHESION", "SUB_VERB_TENSE"));

        List<ProfileEvent> events = builder.buildEvents(submission);

        // Even though ERR_ARTICLE appeared twice in evidence, SUB_ARTICLE gets exactly ONE event (ERROR).
        // SUB_COHESION and SUB_VERB_TENSE get CLEAN. CRIT_W_TA subskills (e.g. SUB_DATA_OVERVIEW) are not queried.
        assertThat(events).hasSize(3);
        assertThat(events).extracting(ProfileEvent::subskillId)
                .containsExactly("SUB_ARTICLE", "SUB_COHESION", "SUB_VERB_TENSE");
        assertThat(events).extracting(ProfileEvent::type)
                .containsExactly(EventType.ERROR, EventType.CLEAN, EventType.CLEAN);
        assertThat(events).extracting(ProfileEvent::outcome)
                .containsExactly(0.0, 1.0, 1.0);
    }

    @Test
    void buildEvents_practiceDrillInKg_createsDrillEventsWithScoreRatio() {
        Exercise drill = Exercise.builder()
                .id(EXERCISE_ID)
                .skillType(SkillType.READING)
                .exerciseType(ExerciseType.LESSON)
                .build();

        UserSubmission submission = UserSubmission.builder()
                .id(UUID.randomUUID())
                .user(user)
                .exercise(drill)
                .status(SubmissionStatus.GRADED)
                .score(BigDecimal.valueOf(5))
                .maxScore(BigDecimal.valueOf(6))
                .submittedAt(LocalDateTime.of(2026, 10, 21, 9, 0))
                .build();

        when(kgGraphClient.findPracticedSubSkills("exercises:" + EXERCISE_ID))
                .thenReturn(List.of("SUB_ARTICLE"));

        List<ProfileEvent> events = builder.buildEvents(submission);

        assertThat(events).hasSize(1);
        ProfileEvent event = events.get(0);
        assertThat(event.userId()).isEqualTo(USER_ID.toString());
        assertThat(event.subskillId()).isEqualTo("SUB_ARTICLE");
        assertThat(event.type()).isEqualTo(EventType.DRILL);
        assertThat(event.outcome()).isCloseTo(5.0 / 6.0, org.assertj.core.api.Assertions.within(1e-9));
        verify(kgGraphClient, never()).findAffectedSubSkills( eq("SKILL_W"), anyList());
    }

    @Test
    void buildEvents_regularReadingExerciseNotInKg_returnsEmptyList() {
        Exercise readingEx = Exercise.builder()
                .id(EXERCISE_ID)
                .skillType(SkillType.READING)
                .exerciseType(ExerciseType.PRACTICE)
                .build();

        UserSubmission submission = UserSubmission.builder()
                .id(UUID.randomUUID())
                .user(user)
                .exercise(readingEx)
                .status(SubmissionStatus.GRADED)
                .score(BigDecimal.valueOf(8))
                .maxScore(BigDecimal.valueOf(10))
                .build();

        when(kgGraphClient.findPracticedSubSkills("exercises:" + EXERCISE_ID)).thenReturn(List.of());

        assertThat(builder.buildEvents(submission)).isEmpty();
    }

    @Test
    void buildEvents_failedOrGradingSubmission_returnsEmptyListWithoutQueryingKg() {
        Exercise exercise = Exercise.builder()
                .id(EXERCISE_ID)
                .skillType(SkillType.SPEAKING)
                .build();

        UserSubmission failed = UserSubmission.builder()
                .id(UUID.randomUUID())
                .user(user)
                .exercise(exercise)
                .status(SubmissionStatus.FAILED)
                .build();

        assertThat(builder.buildEvents(failed)).isEmpty();
        verify(kgGraphClient, never()).findPracticedSubSkills(org.mockito.ArgumentMatchers.anyString());
    }
}

