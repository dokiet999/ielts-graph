package com.ielts.backend.job;

import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.repository.UserSubmissionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Writing and Speaking grading commit a GRADING row before calling the ASR and the LLM. If the request dies
 * before step 3 (restart, crash, the final save fails twice), the row would stay GRADING forever and keep using
 * up an attempt. This job marks such rows FAILED with the code GRADING_TIMEOUT, so the learner can submit again.
 * <p>
 * {@code app.grading.stale-after} must be longer than the slowest request (ASR timeout 180 s + 2 LLM calls of
 * 60 s), otherwise a submission that is still being graded would be failed.
 */
@Slf4j
@Component
public class StaleGradingJob {

    public static final String GRADING_TIMEOUT = "GRADING_TIMEOUT";

    private final UserSubmissionRepository userSubmissionRepository;
    private final Duration staleAfter;

    public StaleGradingJob(UserSubmissionRepository userSubmissionRepository,
                           @Value("${app.grading.stale-after:PT10M}") Duration staleAfter) {
        this.userSubmissionRepository = userSubmissionRepository;
        this.staleAfter = staleAfter;
    }

    @Scheduled(initialDelayString = "${app.grading.stale-check-initial-delay-ms:60000}",
            fixedDelayString = "${app.grading.stale-check-delay-ms:120000}")
    @Transactional
    public int failStaleSubmissions() {
        int changed = userSubmissionRepository.failStaleGrading(SubmissionStatus.GRADING, SubmissionStatus.FAILED,
                GRADING_TIMEOUT, LocalDateTime.now().minus(staleAfter));
        if (changed > 0) {
            log.warn("Marked {} submission(s) stuck in GRADING for more than {} as FAILED", changed, staleAfter);
        }
        return changed;
    }
}
