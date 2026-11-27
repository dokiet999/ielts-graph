package com.ielts.backend.job;

import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.exception.customException.KgUnavailableException;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.service.LearnerProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfileBackfillJobTest {

    @Mock
    UserSubmissionRepository userSubmissionRepository;
    @Mock
    LearnerProfileService learnerProfileService;

    private ProfileBackfillJob job;
    private final UUID first = UUID.randomUUID();
    private final UUID second = UUID.randomUUID();
    private final UUID third = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        job = new ProfileBackfillJob(userSubmissionRepository, learnerProfileService, 100);
        when(userSubmissionRepository.findIdsNotInProfileForAllUsers(eq(SubmissionStatus.GRADED), any(), any()))
                .thenReturn(List.of(first, second, third));
    }

    @Test
    void appliesPendingSubmissionsOldestFirst() {
        assertThat(job.applyMissingSubmissions()).isEqualTo(3);

        InOrder order = inOrder(learnerProfileService);
        order.verify(learnerProfileService).applySubmission(first);
        order.verify(learnerProfileService).applySubmission(second);
        order.verify(learnerProfileService).applySubmission(third);
    }

    @Test
    void stopsWhenTheKnowledgeGraphIsDown() {
        lenient().doThrow(new KgUnavailableException("down")).when(learnerProfileService).applySubmission(second);

        assertThat(job.applyMissingSubmissions()).isEqualTo(1);

        verify(learnerProfileService, never()).applySubmission(third);
    }

    @Test
    void skipsASubmissionWithItsOwnProblem() {
        lenient().doThrow(new IllegalStateException("bad feedback")).when(learnerProfileService).applySubmission(second);

        assertThat(job.applyMissingSubmissions()).isEqualTo(2);

        verify(learnerProfileService).applySubmission(third);
    }
}
