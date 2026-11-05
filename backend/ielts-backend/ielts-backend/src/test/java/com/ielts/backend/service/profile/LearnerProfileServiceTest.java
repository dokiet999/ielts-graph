package com.ielts.backend.service.profile;

import com.ielts.backend.config.LearnerProfileConfig;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.LearnerSkillState;
import com.ielts.backend.entity.User;
import com.ielts.backend.entity.UserSubmission;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.exception.KgUnavailableException;
import com.ielts.backend.repository.LearnerSkillStateRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.service.LearnerProfileService;
import com.ielts.backend.service.implement.LearnerProfileServiceImpl;
import com.ielts.backend.service.kg.KgGraphClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.TransactionStatus;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionCallbackWithoutResult;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LearnerProfileServiceTest {

    private static final UUID USER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID EXERCISE_ID = UUID.fromString("60000000-0000-0000-0000-000000000002");
    private static final UUID SUBMISSION_ID = UUID.fromString("77777777-7777-7777-7777-777777777777");

    @Mock
    private UserSubmissionRepository userSubmissionRepository;

    @Mock
    private LearnerSkillStateRepository learnerSkillStateRepository;

    @Mock
    private KgGraphClient kgGraphClient;

    @Mock
    private TransactionTemplate transactionTemplate;

    private LearnerProfileService learnerProfileService;
    private UserSubmission submission;

    @BeforeEach
    void setUp() {
        ProfileEventBuilder eventBuilder = new ProfileEventBuilder(kgGraphClient);
        SkillStateUpdater updater = new SkillStateUpdater(new LearnerProfileConfig());
        learnerProfileService = new LearnerProfileServiceImpl(
                userSubmissionRepository,
                learnerSkillStateRepository,
                eventBuilder,
                updater,
                transactionTemplate
        );

        lenient().doAnswer(invocation -> {
            Consumer<TransactionStatus> action = invocation.getArgument(0);
            action.accept(new SimpleTransactionStatus());
            return null;
        }).when(transactionTemplate).executeWithoutResult(any());

        User user = User.builder().id(USER_ID).email("u@test.local").fullName("User").build();
        Exercise exercise = Exercise.builder().id(EXERCISE_ID).skillType(SkillType.READING).build();
        submission = UserSubmission.builder()
                .id(SUBMISSION_ID)
                .user(user)
                .exercise(exercise)
                .status(SubmissionStatus.GRADED)
                .score(BigDecimal.valueOf(5))
                .maxScore(BigDecimal.valueOf(6))
                .submittedAt(LocalDateTime.of(2026, 10, 25, 10, 0))
                .build();
    }

    @Test
    void applySubmission_calledTwice_appliesEventsOnlyOnceAndSetsProfileAppliedAt() {
        when(userSubmissionRepository.findByIdWithExerciseAndUser(SUBMISSION_ID))
                .thenReturn(Optional.of(submission));
        when(userSubmissionRepository.findByIdForUpdate(SUBMISSION_ID))
                .thenReturn(Optional.of(submission));
        when(kgGraphClient.findPracticedSubSkills("exercises:" + EXERCISE_ID))
                .thenReturn(List.of("SUB_ARTICLE"));
        when(learnerSkillStateRepository.findByUserIdAndSubskillIdInForUpdate(eq(USER_ID), any()))
                .thenReturn(List.of());

        // First call applies the DRILL event and sets profileAppliedAt
        learnerProfileService.applySubmission(SUBMISSION_ID);

        assertThat(submission.getProfileAppliedAt()).isNotNull();

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<LearnerSkillState>> savedCaptor = ArgumentCaptor.forClass(Collection.class);
        verify(learnerSkillStateRepository, times(1)).saveAll(savedCaptor.capture());
        Collection<LearnerSkillState> savedStates = savedCaptor.getValue();
        assertThat(savedStates).hasSize(1);
        LearnerSkillState state = savedStates.iterator().next();
        assertThat(state.getSubskillId()).isEqualTo("SUB_ARTICLE");
        // Initial 0.5 + 1/3 * (5/6 - 0.5) = 0.6111
        assertThat(state.getMastery()).isCloseTo(0.6111, within(0.0001));
        assertThat(state.getEvidence()).isCloseTo(1.0, within(1e-9));

        // Second call sees profileAppliedAt != null and does nothing
        learnerProfileService.applySubmission(SUBMISSION_ID);
        verify(learnerSkillStateRepository, times(1)).saveAll(any());
        verify(kgGraphClient, times(1)).findPracticedSubSkills(any());
    }

    @Test
    void applySubmission_whenKgThrowsUnavailable_doesNotMarkSubmissionApplied() {
        when(userSubmissionRepository.findByIdWithExerciseAndUser(SUBMISSION_ID))
                .thenReturn(Optional.of(submission));
        when(kgGraphClient.findPracticedSubSkills("exercises:" + EXERCISE_ID))
                .thenThrow(new KgUnavailableException("Neo4j down", new RuntimeException("conn refused")));

        assertThatThrownBy(() -> learnerProfileService.applySubmission(SUBMISSION_ID))
                .isInstanceOf(KgUnavailableException.class);

        assertThat(submission.getProfileAppliedAt()).isNull();
        verify(learnerSkillStateRepository, never()).saveAll(any());
        verify(userSubmissionRepository, never()).save(any());
    }

    @Test
    void applySubmission_nonGradedOrMissingSubmission_isIgnoredWithoutError() {
        submission.setStatus(SubmissionStatus.FAILED);
        when(userSubmissionRepository.findByIdWithExerciseAndUser(SUBMISSION_ID))
                .thenReturn(Optional.of(submission));

        learnerProfileService.applySubmission(SUBMISSION_ID);

        assertThat(submission.getProfileAppliedAt()).isNull();
        verify(kgGraphClient, never()).findPracticedSubSkills(any());
        verify(learnerSkillStateRepository, never()).saveAll(any());
    }
}

