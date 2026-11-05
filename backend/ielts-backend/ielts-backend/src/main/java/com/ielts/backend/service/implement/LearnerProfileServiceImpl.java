package com.ielts.backend.service.implement;

import com.ielts.backend.entity.LearnerSkillState;
import com.ielts.backend.entity.UserSubmission;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.repository.LearnerSkillStateRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.service.LearnerProfileService;
import com.ielts.backend.service.profile.ProfileEvent;
import com.ielts.backend.service.profile.ProfileEventBuilder;
import com.ielts.backend.service.profile.SkillState;
import com.ielts.backend.service.profile.SkillStateUpdater;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Implementation of {@link LearnerProfileService} (W6 Issue 2, step 6).
 */
@Service
@RequiredArgsConstructor
public class LearnerProfileServiceImpl implements LearnerProfileService {

    private final UserSubmissionRepository userSubmissionRepository;
    private final LearnerSkillStateRepository learnerSkillStateRepository;
    private final ProfileEventBuilder profileEventBuilder;
    private final SkillStateUpdater skillStateUpdater;
    private final TransactionTemplate transactionTemplate;

    @Override
    public void applySubmission(UUID submissionId) {
        if (submissionId == null) {
            return;
        }

        // Step 1: Load submission with exercise and user; skip if missing, not GRADED, or already applied.
        Optional<UserSubmission> loadedOpt = userSubmissionRepository.findByIdWithExerciseAndUser(submissionId);
        if (loadedOpt.isEmpty()) {
            return;
        }
        UserSubmission loaded = loadedOpt.get();
        if (loaded.getStatus() != SubmissionStatus.GRADED || loaded.getProfileAppliedAt() != null) {
            return;
        }

        // Step 2: Build events outside the write transaction (queries Neo4j).
        // If Neo4j fails (KgUnavailableException), the exception bubbles up and profile_applied_at remains null.
        List<ProfileEvent> events = profileEventBuilder.buildEvents(loaded);
        UUID userId = loaded.getUser().getId();

        // Step 3: Inside a transaction, lock the submission row and skill state rows, apply updates, and mark applied.
        transactionTemplate.executeWithoutResult(status -> {
            UserSubmission lockedSubmission = userSubmissionRepository.findByIdForUpdate(submissionId)
                    .orElse(null);
            if (lockedSubmission == null
                    || lockedSubmission.getStatus() != SubmissionStatus.GRADED
                    || lockedSubmission.getProfileAppliedAt() != null) {
                return;
            }

            if (!events.isEmpty()) {
                Set<String> subskillIds = new LinkedHashSet<>();
                for (ProfileEvent ev : events) {
                    subskillIds.add(ev.subskillId());
                }

                List<LearnerSkillState> existingRows = learnerSkillStateRepository
                        .findByUserIdAndSubskillIdInForUpdate(userId, subskillIds);
                Map<String, LearnerSkillState> rowBySubskill = new HashMap<>();
                for (LearnerSkillState row : existingRows) {
                    rowBySubskill.put(row.getSubskillId(), row);
                }

                for (ProfileEvent event : events) {
                    LearnerSkillState entity = rowBySubskill.get(event.subskillId());
                    SkillState currentState = entity != null
                            ? toSkillState(entity)
                            : skillStateUpdater.initialState();
                    SkillState nextState = skillStateUpdater.update(currentState, event);

                    if (entity == null) {
                        entity = LearnerSkillState.builder()
                                .userId(userId)
                                .subskillId(event.subskillId())
                                .mastery(nextState.mastery())
                                .evidence(nextState.evidence())
                                .lastUpdate(toLocalDateTime(nextState.lastUpdate()))
                                .build();
                        rowBySubskill.put(event.subskillId(), entity);
                    } else {
                        entity.setMastery(nextState.mastery());
                        entity.setEvidence(nextState.evidence());
                        entity.setLastUpdate(toLocalDateTime(nextState.lastUpdate()));
                    }
                }

                learnerSkillStateRepository.saveAll(rowBySubskill.values());
            }

            lockedSubmission.setProfileAppliedAt(LocalDateTime.now());
            userSubmissionRepository.save(lockedSubmission);
        });
    }

    private static SkillState toSkillState(LearnerSkillState entity) {
        Instant lastUpdate = entity.getLastUpdate() != null
                ? entity.getLastUpdate().atZone(ZoneId.systemDefault()).toInstant()
                : null;
        return new SkillState(
                entity.getMastery() != null ? entity.getMastery() : 0.5,
                entity.getEvidence() != null ? entity.getEvidence() : 0.0,
                lastUpdate
        );
    }

    private static LocalDateTime toLocalDateTime(Instant instant) {
        if (instant == null) {
            return null;
        }
        return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
    }
}

