package com.ielts.backend.service.profile;

import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.UserSubmission;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.service.kg.KgGraphClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Builds {@link ProfileEvent} instances from a graded {@link UserSubmission}
 * (W6 Issue 2, step 5; docs/learner-profile-rules.md, section 2).
 */
@Component
@RequiredArgsConstructor
public class ProfileEventBuilder {

    public static final String SKILL_WRITING = "SKILL_W";
    public static final String SKILL_SPEAKING = "SKILL_S";
    public static final String PRONUNCIATION_CRITERION = "CRIT_S_P";

    private final KgGraphClient kgGraphClient;

    /**
     * Extracts learner profile events from a submission.
     * Returns an empty list if the submission is null or not {@link SubmissionStatus#GRADED}.
     */
    public List<ProfileEvent> buildEvents(UserSubmission submission) {
        if (submission == null || submission.getStatus() != SubmissionStatus.GRADED) {
            return List.of();
        }
        Exercise exercise = submission.getExercise();
        if (exercise == null) {
            return List.of();
        }

        // Only AI-graded Writing and Speaking attempts measure the learner. Practice drills (multiple choice,
        // fill in the blank) are practice only and do not change the profile.
        SkillType skillType = exercise.getSkillType();
        if (skillType != SkillType.WRITING && skillType != SkillType.SPEAKING) {
            return List.of();
        }
        String userId = submission.getUser() != null && submission.getUser().getId() != null
                ? submission.getUser().getId().toString()
                : "";
        String kgSkill = skillType == SkillType.WRITING ? SKILL_WRITING : SKILL_SPEAKING;
        return buildAiAttemptEvents(submission, userId, resolveEventTime(submission), kgSkill);
    }

    private List<ProfileEvent> buildAiAttemptEvents(
            UserSubmission submission,
            String userId,
            Instant eventTime,
            String kgSkill
    ) {
        Map<String, Object> feedback = submission.getAiStructuredFeedback();
        if (feedback == null || feedback.isEmpty()) {
            return List.of();
        }
        Object criteriaObj = feedback.get("criteria");
        if (!(criteriaObj instanceof Map<?, ?> criteriaMap) || criteriaMap.isEmpty()) {
            return List.of();
        }

        List<String> gradedCriteria = new ArrayList<>();
        Set<String> reportedErrors = new LinkedHashSet<>();

        for (Map.Entry<?, ?> entry : criteriaMap.entrySet()) {
            if (!(entry.getKey() instanceof String criterionId) || criterionId.isBlank()) {
                continue;
            }
            // Without pronunciation scores the Pronunciation band is only an indirect estimate:
            // it is neither evidence of a problem nor of mastery
            if (PRONUNCIATION_CRITERION.equals(criterionId) && !hasPronunciationScores(submission)) {
                continue;
            }
            gradedCriteria.add(criterionId);
            if (entry.getValue() instanceof Map<?, ?> criterionBody) {
                Object evidenceObj = criterionBody.get("evidence");
                if (evidenceObj instanceof Iterable<?> evidenceList) {
                    for (Object item : evidenceList) {
                        if (item instanceof Map<?, ?> evMap) {
                            Object errType = evMap.get("error_type");
                            if (errType == null) {
                                errType = evMap.get("errorType");
                            }
                            if (errType instanceof String errStr && !errStr.isBlank()) {
                                reportedErrors.add(errStr);
                            }
                        }
                    }
                }
            }
        }

        if (gradedCriteria.isEmpty()) {
            return List.of();
        }

        Set<String> affectedSubSkills = new TreeSet<>();
        if (!reportedErrors.isEmpty()) {
            affectedSubSkills.addAll(
                    kgGraphClient.findAffectedSubSkills(kgSkill, new ArrayList<>(reportedErrors))
            );
        }

        Set<String> criteriaSubSkills = new TreeSet<>(
                kgGraphClient.findSubSkillsByCriteria(gradedCriteria)
        );

        Set<String> allRelevantSubSkills = new TreeSet<>(criteriaSubSkills);
        allRelevantSubSkills.addAll(affectedSubSkills);

        List<ProfileEvent> events = new ArrayList<>(allRelevantSubSkills.size());
        for (String subSkillId : allRelevantSubSkills) {
            if (affectedSubSkills.contains(subSkillId)) {
                events.add(new ProfileEvent(userId, eventTime, subSkillId, EventType.ERROR, 0.0));
            } else {
                events.add(new ProfileEvent(userId, eventTime, subSkillId, EventType.CLEAN, 1.0));
            }
        }
        return events;
    }

    /** A Speaking submission stores the pronunciation scores in answers.pronunciation (null when not scored). */
    private static boolean hasPronunciationScores(UserSubmission submission) {
        Map<String, Object> answers = submission.getAnswers();
        return answers != null && answers.get("pronunciation") instanceof Map<?, ?> scores && !scores.isEmpty();
    }

    public static Instant resolveEventTime(UserSubmission submission) {
        LocalDateTime ldt = submission.getGradedAt() != null
                ? submission.getGradedAt()
                : submission.getSubmittedAt();
        if (ldt == null) {
            return Instant.now();
        }
        return ldt.atZone(ZoneId.systemDefault()).toInstant();
    }
}

