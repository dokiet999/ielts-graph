package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.TargetBandRequest;
import com.ielts.backend.dto.response.PersonalizationResponse;
import com.ielts.backend.dto.response.PersonalizationResponse.SkillProfile;
import com.ielts.backend.entity.LearnerSkillState;
import com.ielts.backend.entity.LearnerTargetBand;
import com.ielts.backend.entity.Users;
import com.ielts.backend.entity.UserSubmission;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.exception.customException.BadRequestException;
import com.ielts.backend.exception.customException.UnauthorizedException;
import com.ielts.backend.repository.LearnerSkillStateRepository;
import com.ielts.backend.repository.LearnerTargetBandRepository;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.LearnerProfileService;
import com.ielts.backend.service.PersonalizationService;
import com.ielts.backend.service.kg.KgGraphClient;
import com.ielts.backend.service.kg.KgGraphClient.PrerequisiteRow;
import com.ielts.backend.service.kg.KgGraphClient.SubSkillResourceRow;
import com.ielts.backend.service.profile.PersonalizationAssembler;
import com.ielts.backend.service.profile.PersonalizationAssembler.GradedAttempt;
import com.ielts.backend.service.profile.PersonalizationAssembler.MasteryState;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PersonalizationServiceImpl implements PersonalizationService {

    private static final List<SkillType> AI_GRADED_SKILLS = List.of(SkillType.WRITING, SkillType.SPEAKING);
    private static final BigDecimal HALF_BAND = new BigDecimal("0.5");

    private final UserRepository userRepository;
    private final UserSubmissionRepository userSubmissionRepository;
    private final LearnerSkillStateRepository learnerSkillStateRepository;
    private final LearnerTargetBandRepository learnerTargetBandRepository;
    private final LearnerProfileService learnerProfileService;
    private final KgGraphClient kgGraphClient;

    @Override
    public PersonalizationResponse getPersonalization(String username) {
        Users user = currentUser(username);

        // Submissions graded while the Knowledge Graph was down are applied now, in order
        for (UUID submissionId : userSubmissionRepository.findIdsNotInProfile(
                user.getId(), SubmissionStatus.GRADED, AI_GRADED_SKILLS)) {
            learnerProfileService.applySubmission(submissionId);
        }

        Map<String, MasteryState> states = new HashMap<>();
        for (LearnerSkillState s : learnerSkillStateRepository.findByUserIdOrderBySubskillIdAsc(user.getId())) {
            states.put(s.getSubskillId(), new MasteryState(s.getMastery(), s.getEvidence()));
        }
        Map<String, Double> targets = new HashMap<>();
        for (LearnerTargetBand t : learnerTargetBandRepository.findByUserId(user.getId())) {
            targets.put(t.getSkillType(), t.getTargetBand().doubleValue());
        }
        List<UserSubmission> graded = userSubmissionRepository.findGradedWithFeedback(
                user.getId(), SubmissionStatus.GRADED, AI_GRADED_SKILLS);
        List<PrerequisiteRow> prerequisites = kgGraphClient.findPrerequisites();

        List<SkillProfile> skills = new ArrayList<>();
        for (SkillType skill : AI_GRADED_SKILLS) {
            String kgSkill = skill == SkillType.WRITING ? "SKILL_W" : "SKILL_S";
            List<GradedAttempt> attempts = graded.stream()
                    .filter(s -> s.getExercise().getSkillType() == skill)
                    .map(s -> PersonalizationAssembler.attemptOf(s.getId(),
                            s.getGradedAt() != null ? s.getGradedAt() : s.getSubmittedAt(),
                            s.getScore(), s.getAiStructuredFeedback(), s.getAnswers()))
                    .toList();
            List<SubSkillResourceRow> resources = kgGraphClient.findSubSkillResources(kgSkill);
            skills.add(PersonalizationAssembler.assemble(skill.name(), kgSkill, targets.get(skill.name()),
                    attempts, states, kgGraphClient.findSkillStructure(kgSkill), resources, prerequisites,
                    practicedCounts(user.getId(), resources)));
        }
        return PersonalizationResponse.builder().skills(skills).build();
    }

    @Override
    public PersonalizationResponse setTargetBand(String username, TargetBandRequest request) {
        Users user = currentUser(username);
        String skill = request.getSkill().trim().toUpperCase();
        if (!skill.equals(SkillType.WRITING.name()) && !skill.equals(SkillType.SPEAKING.name())) {
            throw new BadRequestException("INVALID_SKILL", "skill must be WRITING or SPEAKING");
        }
        BigDecimal band = request.getTargetBand();
        if (band.remainder(HALF_BAND).compareTo(BigDecimal.ZERO) != 0) {
            throw new BadRequestException("INVALID_TARGET_BAND", "targetBand must be a multiple of 0.5");
        }
        learnerTargetBandRepository.save(LearnerTargetBand.builder()
                .userId(user.getId())
                .skillType(skill)
                .targetBand(band)
                .build());
        return getPersonalization(username);
    }

    /** Graded attempts of the learner on the exercises behind the Resources. */
    private Map<UUID, Integer> practicedCounts(UUID userId, List<SubSkillResourceRow> resources) {
        List<UUID> exerciseIds = resources.stream()
                .map(r -> PersonalizationAssembler.exerciseIdOf(r.sqlRef()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        Map<UUID, Integer> counts = new HashMap<>();
        if (exerciseIds.isEmpty()) {
            return counts;
        }
        for (UserSubmissionRepository.SubmissionScore score
                : userSubmissionRepository.findScoresByUserIdAndExerciseIds(userId, exerciseIds)) {
            if (score.getStatus() == SubmissionStatus.GRADED) {
                counts.merge(score.getExerciseId(), 1, Integer::sum);
            }
        }
        return counts;
    }

    private Users currentUser(String username) {
        return userRepository.findByUsername(DbUserDetailsService.normalize(username))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));
    }
}
