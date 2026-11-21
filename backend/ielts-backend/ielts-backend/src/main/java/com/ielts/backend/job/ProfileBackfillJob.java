package com.ielts.backend.job;

import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.exception.customException.KgUnavailableException;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.service.LearnerProfileService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Applies to the learner profile the graded Writing/Speaking submissions it missed, for example because the
 * Knowledge Graph was down when they were graded. Without it they would only be applied when the learner opens
 * the personalization tab, and the profile read by recommendations and the evaluation would miss them.
 * <p>
 * Oldest first. Stops when the KG is down (every submission would fail, and applying later submissions first
 * would change the order of the events); any other error only skips that submission.
 */
@Slf4j
@Component
public class ProfileBackfillJob {

    /** Same skills as PersonalizationServiceImpl: drills and objective exercises create no profile events. */
    private static final List<SkillType> AI_GRADED_SKILLS = List.of(SkillType.WRITING, SkillType.SPEAKING);

    private final UserSubmissionRepository userSubmissionRepository;
    private final LearnerProfileService learnerProfileService;
    private final int batchSize;

    public ProfileBackfillJob(UserSubmissionRepository userSubmissionRepository,
                              LearnerProfileService learnerProfileService,
                              @Value("${app.profile.backfill-batch-size:100}") int batchSize) {
        this.userSubmissionRepository = userSubmissionRepository;
        this.learnerProfileService = learnerProfileService;
        this.batchSize = batchSize;
    }

    @Scheduled(initialDelayString = "${app.profile.backfill-initial-delay-ms:120000}",
            fixedDelayString = "${app.profile.backfill-delay-ms:300000}")
    public int applyMissingSubmissions() {
        List<UUID> pending = userSubmissionRepository.findIdsNotInProfileForAllUsers(
                SubmissionStatus.GRADED, AI_GRADED_SKILLS, PageRequest.of(0, batchSize));
        int applied = 0;
        for (UUID submissionId : pending) {
            try {
                learnerProfileService.applySubmission(submissionId);
                applied++;
            } catch (KgUnavailableException ex) {
                // Every following submission would fail too; try again at the next run, in the same order
                log.warn("Profile backfill paused, Knowledge Graph unavailable ({} applied): {}", applied, ex.getMessage());
                break;
            } catch (Exception ex) {
                // A problem of this submission only: skip it so it does not block the others forever
                log.warn("Profile backfill skipped submission {}: {}", submissionId, ex.getMessage());
            }
        }
        if (applied > 0) {
            log.info("Profile backfill applied {} submission(s)", applied);
        }
        return applied;
    }
}
