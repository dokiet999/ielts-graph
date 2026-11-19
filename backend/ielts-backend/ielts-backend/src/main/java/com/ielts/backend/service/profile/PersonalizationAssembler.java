package com.ielts.backend.service.profile;

import com.ielts.backend.dto.response.PersonalizationResponse.BandPoint;
import com.ielts.backend.dto.response.PersonalizationResponse.CriterionGap;
import com.ielts.backend.dto.response.PersonalizationResponse.CriterionProfile;
import com.ielts.backend.dto.response.PersonalizationResponse.NodeRef;
import com.ielts.backend.dto.response.PersonalizationResponse.PracticeResource;
import com.ielts.backend.dto.response.PersonalizationResponse.SkillProfile;
import com.ielts.backend.dto.response.PersonalizationResponse.SubSkillProfile;
import com.ielts.backend.dto.response.PersonalizationResponse.Weakness;
import com.ielts.backend.service.kg.KgGraphClient.PrerequisiteRow;
import com.ielts.backend.service.kg.KgGraphClient.SkillStructureRow;
import com.ielts.backend.service.kg.KgGraphClient.SubSkillResourceRow;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Builds the personalization tab of one skill from the learner's graded attempts, the skill state and the
 * Knowledge Graph (graph method of W7). Pure: no database or Neo4j access, so the ranking is unit tested.
 * <p>
 * An error is WEAK while it is in the latest attempt, IMPROVING once it is gone from it, and RESOLVED after
 * {@value #RESOLVED_STREAK} attempts in a row without it. Errors are ranked by
 * {@code priority = 0.5 * (1 - mastery) + 0.3 * recent rate + 0.2 * min(gap to target, 2) / 2}.
 */
public final class PersonalizationAssembler {

    /** Attempts used for the current band and the recent error rate. */
    public static final int RECENT_WINDOW = 3;
    /** Attempts in a row without an error before it counts as resolved. */
    public static final int RESOLVED_STREAK = 3;
    public static final int MAX_RESOURCES = 3;
    /** A prerequisite below this mastery is suggested first. */
    public static final double WEAK_PREREQUISITE = 0.4;

    private static final double W_MASTERY = 0.5;
    private static final double W_RECENT = 0.3;
    private static final double W_GAP = 0.2;
    private static final double MAX_GAP = 2.0;
    private static final double UNKNOWN_MASTERY = 0.5;

    private static final List<String> CRITERION_ORDER = List.of(
            "CRIT_W_TA", "CRIT_W_TR", "CRIT_W_CC", "CRIT_W_LR", "CRIT_W_GRA",
            "CRIT_S_FC", "CRIT_S_LR", "CRIT_S_GRA", "CRIT_S_P");
    private static final String PRONUNCIATION_CRITERION = "CRIT_S_P";

    /** One graded Writing or Speaking attempt as the tab needs it. */
    public record GradedAttempt(UUID submissionId, LocalDateTime gradedAt, Double overallBand,
                                Map<String, Double> criterionBands, Set<String> errorIds) {
    }

    /** Current state of one SubSkill (learner_skill_state). */
    public record MasteryState(double mastery, double evidence) {
    }

    private PersonalizationAssembler() {
    }

    /**
     * Reads the criterion bands and the ErrorTypes of the structured AI feedback of one attempt. The Pronunciation
     * band is left out when no pronunciation scores were measured, as in the profile events.
     */
    public static GradedAttempt attemptOf(UUID submissionId, LocalDateTime gradedAt, BigDecimal overallBand,
                                          Map<String, Object> feedback, Map<String, Object> answers) {
        boolean pronunciationScored = answers != null
                && answers.get("pronunciation") instanceof Map<?, ?> scores && !scores.isEmpty();
        Map<String, Double> bands = new LinkedHashMap<>();
        Set<String> errors = new LinkedHashSet<>();
        if (feedback != null && feedback.get("criteria") instanceof Map<?, ?> criteria) {
            for (Map.Entry<?, ?> entry : criteria.entrySet()) {
                if (!(entry.getKey() instanceof String criterionId) || !(entry.getValue() instanceof Map<?, ?> body)) {
                    continue;
                }
                if (PRONUNCIATION_CRITERION.equals(criterionId) && !pronunciationScored) {
                    continue;
                }
                if (body.get("band") instanceof Number band) {
                    bands.put(criterionId, band.doubleValue());
                }
                if (body.get("evidence") instanceof Iterable<?> evidence) {
                    for (Object item : evidence) {
                        if (item instanceof Map<?, ?> ev && ev.get("error_type") instanceof String code && !code.isBlank()) {
                            errors.add(code);
                        }
                    }
                }
            }
        }
        return new GradedAttempt(submissionId, gradedAt, overallBand != null ? overallBand.doubleValue() : null,
                bands, errors);
    }

    /**
     * @param attempts        graded attempts of the skill, oldest first
     * @param states          learner_skill_state by SubSkill id
     * @param practicedCounts graded attempts of the learner by exercise id
     */
    public static SkillProfile assemble(String skill, String kgSkill, Double targetBand,
                                        List<GradedAttempt> attempts, Map<String, MasteryState> states,
                                        List<SkillStructureRow> structure, List<SubSkillResourceRow> resources,
                                        List<PrerequisiteRow> prerequisites, Map<UUID, Integer> practicedCounts) {
        Graph graph = Graph.of(structure);

        // Bands: overall and per criterion, over the last attempts
        List<BandPoint> bandHistory = new ArrayList<>();
        for (GradedAttempt a : attempts) {
            if (a.overallBand() != null) {
                bandHistory.add(point(a, a.overallBand()));
            }
        }
        Double currentBand = recentMean(bandHistory);

        Map<String, Double> criterionCurrent = new HashMap<>();
        List<CriterionProfile> criteria = new ArrayList<>();
        for (String criterionId : graph.criterionIds()) {
            List<BandPoint> history = new ArrayList<>();
            for (GradedAttempt a : attempts) {
                Double band = a.criterionBands().get(criterionId);
                if (band != null) {
                    history.add(point(a, band));
                }
            }
            Double current = recentMean(history);
            criterionCurrent.put(criterionId, current);
            List<SubSkillProfile> subSkills = new ArrayList<>();
            for (String subSkillId : graph.subSkillsOf(criterionId)) {
                MasteryState state = states.get(subSkillId);
                subSkills.add(SubSkillProfile.builder()
                        .subSkill(graph.node(subSkillId))
                        .mastery(state != null ? round(state.mastery(), 3) : null)
                        .evidence(state != null ? round(state.evidence(), 2) : null)
                        .build());
            }
            criteria.add(CriterionProfile.builder()
                    .criterion(graph.node(criterionId))
                    .currentBand(current)
                    .gap(gapOf(targetBand, current))
                    .history(history)
                    .subSkills(subSkills)
                    .build());
        }

        // Weaknesses: every ErrorType of this skill seen in at least one attempt
        Map<String, List<String>> prerequisitesOf = new HashMap<>();
        for (PrerequisiteRow row : prerequisites) {
            prerequisitesOf.computeIfAbsent(row.subSkillId(), k -> new ArrayList<>()).add(row.prerequisiteId());
        }
        Set<String> seenErrors = new LinkedHashSet<>();
        for (GradedAttempt a : attempts) {
            for (String code : a.errorIds()) {
                if (graph.isError(code)) {
                    seenErrors.add(code);
                }
            }
        }
        int window = Math.min(RECENT_WINDOW, attempts.size());
        List<Weakness> weaknesses = new ArrayList<>();
        for (String errorId : seenErrors) {
            weaknesses.add(weaknessOf(errorId, attempts, window, graph, states, criterionCurrent, targetBand,
                    prerequisitesOf, resources, practicedCounts));
        }
        weaknesses.sort(Comparator.comparingInt((Weakness w) -> statusRank(w.getStatus()))
                .thenComparing(Weakness::getPriority, Comparator.reverseOrder())
                .thenComparing(w -> w.getErrorType().getId()));

        // Criteria below the target, with the number of errors still active in them
        List<CriterionGap> gaps = new ArrayList<>();
        for (CriterionProfile c : criteria) {
            if (c.getGap() == null || c.getGap() <= 0) {
                continue;
            }
            int active = (int) weaknesses.stream()
                    .filter(w -> !"RESOLVED".equals(w.getStatus()))
                    .filter(w -> w.getCriterion().getId().equals(c.getCriterion().getId()))
                    .count();
            gaps.add(CriterionGap.builder()
                    .criterion(c.getCriterion())
                    .currentBand(c.getCurrentBand())
                    .targetBand(targetBand)
                    .gap(c.getGap())
                    .activeErrorCount(active)
                    .build());
        }
        gaps.sort(Comparator.comparing(CriterionGap::getGap, Comparator.reverseOrder()));

        return SkillProfile.builder()
                .skill(skill)
                .kgSkill(kgSkill)
                .targetBand(targetBand)
                .currentBand(currentBand)
                .attemptCount(attempts.size())
                .bandHistory(bandHistory)
                .criteria(criteria)
                .weaknesses(weaknesses)
                .gaps(gaps)
                .build();
    }

    private static Weakness weaknessOf(String errorId, List<GradedAttempt> attempts, int window, Graph graph,
                                       Map<String, MasteryState> states, Map<String, Double> criterionCurrent,
                                       Double targetBand, Map<String, List<String>> prerequisitesOf,
                                       List<SubSkillResourceRow> resources, Map<UUID, Integer> practicedCounts) {
        int occurrences = 0;
        int recent = 0;
        int lastIndex = -1;
        for (int i = 0; i < attempts.size(); i++) {
            if (attempts.get(i).errorIds().contains(errorId)) {
                occurrences++;
                lastIndex = i;
                if (i >= attempts.size() - window) {
                    recent++;
                }
            }
        }
        int cleanStreak = attempts.size() - 1 - lastIndex;
        String status = cleanStreak == 0 ? "WEAK" : cleanStreak >= RESOLVED_STREAK ? "RESOLVED" : "IMPROVING";

        // The SubSkill on the path is the weakest one the error affects
        String subSkillId = graph.subSkillsOfError(errorId).stream()
                .min(Comparator.comparingDouble((String s) -> masteryOr(states, s)).thenComparing(s -> s))
                .orElseThrow();
        String criterionId = graph.criterionOf(subSkillId);
        MasteryState state = states.get(subSkillId);
        Double criterionBand = criterionCurrent.get(criterionId);
        Double gap = gapOf(targetBand, criterionBand);

        double priority = W_MASTERY * (1 - masteryOr(states, subSkillId))
                + W_RECENT * (window == 0 ? 0 : (double) recent / window)
                + W_GAP * Math.min(Math.max(gap != null ? gap : 0, 0), MAX_GAP) / MAX_GAP;

        String prerequisite = prerequisitesOf.getOrDefault(subSkillId, List.of()).stream()
                .filter(p -> states.containsKey(p) && states.get(p).mastery() < WEAK_PREREQUISITE)
                .min(Comparator.comparingDouble((String p) -> states.get(p).mastery()).thenComparing(p -> p))
                .orElse(null);

        return Weakness.builder()
                .errorType(graph.node(errorId))
                .subSkill(graph.node(subSkillId))
                .criterion(graph.node(criterionId))
                .status(status)
                .occurrences(occurrences)
                .recentOccurrences(recent)
                .recentWindow(window)
                .cleanStreak(cleanStreak)
                .lastSeenAt(attempts.get(lastIndex).gradedAt())
                .mastery(state != null ? round(state.mastery(), 3) : null)
                .criterionBand(criterionBand)
                .targetBand(targetBand)
                .priority(round(priority, 3))
                .prerequisite(prerequisite != null ? graph.node(prerequisite) : null)
                .prerequisiteMastery(prerequisite != null ? round(states.get(prerequisite).mastery(), 3) : null)
                .resources(resourcesFor(errorId, subSkillId, criterionBand, resources, practicedCounts))
                .build();
    }

    /** Resources that FIX the error first, then those that PRACTICE the SubSkill; closest band first. */
    private static List<PracticeResource> resourcesFor(String errorId, String subSkillId, Double band,
                                                       List<SubSkillResourceRow> resources,
                                                       Map<UUID, Integer> practicedCounts) {
        int level = band != null ? (int) Math.floor(band) : 6;
        Map<String, SubSkillResourceRow> byId = new LinkedHashMap<>();
        for (SubSkillResourceRow row : resources) {
            if (row.fixes().contains(errorId) || row.subSkillId().equals(subSkillId)) {
                byId.putIfAbsent(row.resourceId(), row);
            }
        }
        return byId.values().stream()
                .sorted(Comparator.comparing((SubSkillResourceRow r) -> !r.fixes().contains(errorId))
                        .thenComparingInt(r -> bandDistance(r.bands(), level))
                        .thenComparing(SubSkillResourceRow::resourceId))
                .limit(MAX_RESOURCES)
                .map(r -> {
                    UUID exerciseId = exerciseIdOf(r.sqlRef());
                    return PracticeResource.builder()
                            .resourceId(r.resourceId())
                            .nameVi(r.nameVi())
                            .nameEn(r.nameEn())
                            .exerciseId(exerciseId)
                            .fixesError(r.fixes().contains(errorId))
                            .bands(r.bands())
                            .practicedCount(exerciseId != null ? practicedCounts.getOrDefault(exerciseId, 0) : 0)
                            .build();
                })
                .toList();
    }

    private static int bandDistance(List<Integer> bands, int level) {
        return bands.stream().mapToInt(b -> Math.abs(b - level)).min().orElse(Integer.MAX_VALUE);
    }

    /** Exercise id of a Resource ({@code exercises:<uuid>}), null when it is not an exercise. */
    public static UUID exerciseIdOf(String sqlRef) {
        if (sqlRef == null || !sqlRef.startsWith("exercises:")) {
            return null;
        }
        try {
            return UUID.fromString(sqlRef.substring("exercises:".length()));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private static int statusRank(String status) {
        return switch (status) {
            case "WEAK" -> 0;
            case "IMPROVING" -> 1;
            default -> 2;
        };
    }

    private static double masteryOr(Map<String, MasteryState> states, String subSkillId) {
        MasteryState state = states.get(subSkillId);
        return state != null ? state.mastery() : UNKNOWN_MASTERY;
    }

    private static BandPoint point(GradedAttempt a, double band) {
        return BandPoint.builder().submissionId(a.submissionId()).gradedAt(a.gradedAt()).band(band).build();
    }

    private static Double recentMean(List<BandPoint> history) {
        if (history.isEmpty()) {
            return null;
        }
        List<BandPoint> recent = history.subList(Math.max(0, history.size() - RECENT_WINDOW), history.size());
        return round(recent.stream().mapToDouble(BandPoint::getBand).average().orElseThrow(), 2);
    }

    private static Double gapOf(Double target, Double current) {
        return target != null && current != null ? round(target - current, 2) : null;
    }

    private static double round(double value, int scale) {
        return BigDecimal.valueOf(value).setScale(scale, RoundingMode.HALF_UP).doubleValue();
    }

    /** Criterion -> SubSkill -> ErrorType of one skill, with the names of every node. */
    private record Graph(Map<String, NodeRef> nodes, Map<String, List<String>> subSkillsByCriterion,
                         Map<String, String> criterionBySubSkill, Map<String, List<String>> subSkillsByError) {

        static Graph of(List<SkillStructureRow> rows) {
            Map<String, NodeRef> nodes = new HashMap<>();
            Map<String, List<String>> subSkillsByCriterion = new LinkedHashMap<>();
            Map<String, String> criterionBySubSkill = new HashMap<>();
            Map<String, List<String>> subSkillsByError = new HashMap<>();
            List<SkillStructureRow> sorted = rows.stream()
                    .sorted(Comparator.comparingInt((SkillStructureRow r) -> order(r.criterionId()))
                            .thenComparing(SkillStructureRow::criterionId))
                    .toList();
            for (SkillStructureRow r : sorted) {
                nodes.putIfAbsent(r.criterionId(), new NodeRef(r.criterionId(), r.criterionNameVi(), r.criterionNameEn()));
                nodes.putIfAbsent(r.subSkillId(), new NodeRef(r.subSkillId(), r.subSkillNameVi(), r.subSkillNameEn()));
                List<String> subs = subSkillsByCriterion.computeIfAbsent(r.criterionId(), k -> new ArrayList<>());
                if (!subs.contains(r.subSkillId())) {
                    subs.add(r.subSkillId());
                }
                criterionBySubSkill.putIfAbsent(r.subSkillId(), r.criterionId());
                if (r.errorId() != null) {
                    nodes.putIfAbsent(r.errorId(), new NodeRef(r.errorId(), r.errorNameVi(), r.errorNameEn()));
                    List<String> affected = subSkillsByError.computeIfAbsent(r.errorId(), k -> new ArrayList<>());
                    if (!affected.contains(r.subSkillId())) {
                        affected.add(r.subSkillId());
                    }
                }
            }
            return new Graph(nodes, subSkillsByCriterion, criterionBySubSkill, subSkillsByError);
        }

        private static int order(String criterionId) {
            int i = CRITERION_ORDER.indexOf(criterionId);
            return i >= 0 ? i : CRITERION_ORDER.size();
        }

        List<String> criterionIds() {
            return List.copyOf(subSkillsByCriterion.keySet());
        }

        List<String> subSkillsOf(String criterionId) {
            return subSkillsByCriterion.getOrDefault(criterionId, List.of());
        }

        List<String> subSkillsOfError(String errorId) {
            return subSkillsByError.getOrDefault(errorId, List.of());
        }

        String criterionOf(String subSkillId) {
            return criterionBySubSkill.get(subSkillId);
        }

        boolean isError(String errorId) {
            return subSkillsByError.containsKey(errorId);
        }

        NodeRef node(String id) {
            return nodes.getOrDefault(id, new NodeRef(id, null, null));
        }
    }
}
