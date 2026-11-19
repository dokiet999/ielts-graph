package com.ielts.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * The personalization tab: for each AI-graded skill, the learner's bands against their target, the mastery of each
 * SubSkill, and the recurring errors ranked with the Knowledge Graph (error -> SubSkill -> Criterion).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalizationResponse {

    private List<SkillProfile> skills;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillProfile {
        /** WRITING or SPEAKING. */
        private String skill;
        /** Matching KG Skill id: SKILL_W or SKILL_S. */
        private String kgSkill;
        private Double targetBand;
        /** Mean overall band of the last graded attempts (at most 3); null without attempts. */
        private Double currentBand;
        private int attemptCount;
        /** Overall band of every graded attempt, oldest first. */
        private List<BandPoint> bandHistory;
        private List<CriterionProfile> criteria;
        /** Errors seen in the attempts, most urgent first; resolved errors come last. */
        private List<Weakness> weaknesses;
        /** Criteria whose current band is below the target. */
        private List<CriterionGap> gaps;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BandPoint {
        private UUID submissionId;
        private LocalDateTime gradedAt;
        private Double band;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CriterionProfile {
        private NodeRef criterion;
        /** Mean band of this criterion over the last graded attempts (at most 3); null without data. */
        private Double currentBand;
        /** targetBand - currentBand; null without a target or a current band. */
        private Double gap;
        private List<BandPoint> history;
        private List<SubSkillProfile> subSkills;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubSkillProfile {
        private NodeRef subSkill;
        /** Estimated mastery in [0, 1] (docs/learner-profile-rules.md); null before any evidence. */
        private Double mastery;
        private Double evidence;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Weakness {
        private NodeRef errorType;
        private NodeRef subSkill;
        private NodeRef criterion;
        /** WEAK (in the latest attempt), IMPROVING (gone from the latest attempt) or RESOLVED (gone from the last 3). */
        private String status;
        /** Number of attempts that had this error. */
        private int occurrences;
        /** Attempts with this error among the last {@code recentWindow} attempts. */
        private int recentOccurrences;
        private int recentWindow;
        /** Attempts in a row without this error since it was last seen. */
        private int cleanStreak;
        private LocalDateTime lastSeenAt;
        private Double mastery;
        private Double criterionBand;
        private Double targetBand;
        /** Ranking score in [0, 1]: weak mastery, recurring error and a large gap to the target rank higher. */
        private Double priority;
        /** A weak prerequisite of the SubSkill (PREREQUISITE_OF), to strengthen first; null if none. */
        private NodeRef prerequisite;
        private Double prerequisiteMastery;
        private List<PracticeResource> resources;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PracticeResource {
        private String resourceId;
        private String nameVi;
        private String nameEn;
        /** Exercise to open in the runner (from sql_ref exercises:&lt;uuid&gt;). */
        private UUID exerciseId;
        /** True when the Resource FIXES this error, false when it only PRACTICES the SubSkill. */
        private boolean fixesError;
        private List<Integer> bands;
        /** Graded attempts of the learner on this exercise. */
        private int practicedCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CriterionGap {
        private NodeRef criterion;
        private Double currentBand;
        private Double targetBand;
        private Double gap;
        /** Errors of this criterion that are WEAK or IMPROVING; 0 means the band is held back by range, not errors. */
        private int activeErrorCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NodeRef {
        private String id;
        private String nameVi;
        private String nameEn;
    }
}
