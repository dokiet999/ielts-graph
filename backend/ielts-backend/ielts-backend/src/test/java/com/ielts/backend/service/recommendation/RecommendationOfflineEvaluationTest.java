package com.ielts.backend.service.recommendation;

import com.ielts.backend.config.LearnerProfileConfig;
import com.ielts.backend.service.profile.EventType;
import com.ielts.backend.service.profile.ProfileEvent;
import com.ielts.backend.service.profile.SkillState;
import com.ielts.backend.service.profile.SkillStateUpdater;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Offline evaluation of W7 (docs/offline-evaluation-design.md): how well each {@link WeaknessRanker} finds the
 * truly weakest SubSkills of the 60 synthetic learners (data/learner_sim), week by week.
 * <p>
 * A normal test run only checks loose bounds. With {@code -Dsim.write=true} the results are written to
 * Evidence/W07/metrics.csv and Evidence/W07/comparison.csv.
 */
class RecommendationOfflineEvaluationTest {

    private static final Instant START = Instant.parse("2026-09-07T00:00:00Z");
    private static final int WEEKS = 8;
    private static final int TOP = 3;
    private static final int RECENT = 3;
    private static final int[] COMPARED_WEEKS = {2, 4, 8};
    private static final int BOOTSTRAP = 2000;
    private static final long SEED = 20261108L;
    private static final double RANDOM_PRECISION = 3.0 / 25;

    private static final List<WeaknessRanker> METHODS = List.of(
            BaselineRankers.latestAttempt(),
            BaselineRankers.errorCount(),
            GraphMethodRanker.standard(),
            GraphMethodRanker.masteryOnly(),
            GraphMethodRanker.withoutGap());
    private static final String BASELINE = "B2_error_count";
    private static final String GRAPH = "G_graph_method";

    private static Path root;
    private static Map<String, List<Event>> eventsByUser;
    private static Map<String, Double> truth;
    private static Map<String, Map<String, Double>> targets;
    private static List<String> users;
    private static List<String> subSkills;
    private static SkillStructure structure;

    /** One row of interaction_logs.csv. */
    private record Event(Instant time, String subSkill, EventType type, double outcome, String source) {
    }

    /** One criterion band of one attempt (attempt_bands*.csv). */
    private record Band(String user, Instant time, String criterion, double band) {
    }

    /** A data set and profile rules to evaluate. */
    private record Scenario(String name, String bandsFile, boolean drillsCount, double weightClean) {
    }

    private record Scores(double precision, double hit, double spearman, Double belowTarget) {
    }

    @BeforeAll
    static void loadData() throws IOException {
        root = Files.exists(Paths.get("data/learner_sim")) ? Paths.get("") : Paths.get("../../..");
        eventsByUser = new HashMap<>();
        for (String[] c : rows("data/learner_sim/interaction_logs.csv")) {
            eventsByUser.computeIfAbsent(c[0], k -> new ArrayList<>())
                    .add(new Event(Instant.parse(c[1]), c[2], EventType.valueOf(c[3]), Double.parseDouble(c[4]), c[5]));
        }
        // Stable sort: equal times keep the file order
        eventsByUser.values().forEach(list -> list.sort(Comparator.comparing(Event::time)));

        truth = new HashMap<>();
        TreeSet<String> userSet = new TreeSet<>();
        TreeSet<String> subSkillSet = new TreeSet<>();
        for (String[] c : rows("data/learner_sim/true_mastery.csv")) {
            truth.put(c[0] + "|" + c[1] + "|" + c[2], Double.parseDouble(c[3]));
            userSet.add(c[0]);
            subSkillSet.add(c[2]);
        }
        users = List.copyOf(userSet);
        subSkills = List.copyOf(subSkillSet);

        targets = new HashMap<>();
        for (String[] c : rows("data/learner_sim/targets.csv")) {
            targets.computeIfAbsent(c[0], k -> new HashMap<>()).put(c[1], Double.parseDouble(c[2]));
        }

        Map<String, List<String>> criteriaOfSubSkill = new HashMap<>();
        Map<String, String> skillOfCriterion = new HashMap<>();
        for (String[] c : rows("kg/data/relationships.csv")) {
            if (c[0].equals("HAS_SUBSKILL")) {
                criteriaOfSubSkill.computeIfAbsent(c[2], k -> new ArrayList<>()).add(c[1]);
                skillOfCriterion.put(c[1], c[1].startsWith("CRIT_W_") ? "SKILL_W" : "SKILL_S");
            }
        }
        structure = new SkillStructure(criteriaOfSubSkill, skillOfCriterion);
    }

    @Test
    void graphMethodFindsWeakSubSkills_andTheComparisonIsWritten() throws IOException {
        List<Scenario> scenarios = List.of(
                new Scenario("main", "attempt_bands.csv", true, new LearnerProfileConfig().getWeightClean()),
                new Scenario("band_noise_1", "attempt_bands_noise1.csv", true, new LearnerProfileConfig().getWeightClean()),
                new Scenario("rules_w8", "attempt_bands.csv", false, 0.5));

        List<String> metrics = new ArrayList<>(List.of(
                "scenario,method,week,precision_at_3,hit_at_1,spearman,precision_below_target"));
        List<String> comparison = new ArrayList<>(List.of(
                "scenario,week,metric,graph_minus_baseline,ci_low,ci_high,verdict"));
        Map<String, Double> mainWeek8 = new HashMap<>();

        for (Scenario scenario : scenarios) {
            // scores.get(method).get(week) = per-learner scores, in the order of users
            Map<String, Map<Integer, List<Scores>>> scores = evaluate(scenario);
            for (WeaknessRanker method : METHODS) {
                for (int week = 1; week <= WEEKS; week++) {
                    List<Scores> s = scores.get(method.name()).get(week);
                    double precision = mean(s.stream().mapToDouble(Scores::precision).toArray());
                    metrics.add(String.join(",", scenario.name(), method.name(), String.valueOf(week),
                            fmt(precision), fmt(mean(s.stream().mapToDouble(Scores::hit).toArray())),
                            fmt(mean(s.stream().mapToDouble(Scores::spearman).toArray())),
                            fmt(mean(s.stream().filter(x -> x.belowTarget() != null)
                                    .mapToDouble(Scores::belowTarget).toArray()))));
                    if (scenario.name().equals("main") && week == WEEKS) {
                        mainWeek8.put(method.name(), precision);
                    }
                }
            }
            for (int week : COMPARED_WEEKS) {
                comparison.add(compare(scenario.name(), week, "precision_at_3",
                        scores.get(GRAPH).get(week), scores.get(BASELINE).get(week), Scores::precision));
                comparison.add(compare(scenario.name(), week, "spearman",
                        scores.get(GRAPH).get(week), scores.get(BASELINE).get(week), Scores::spearman));
            }
        }

        assertThat(users).hasSize(60);
        assertThat(subSkills).hasSize(25);
        // Loose sanity only: the graph method must beat a random ranking by week 8
        assertThat(mainWeek8.get(GRAPH)).isGreaterThan(RANDOM_PRECISION);
        assertThat(metrics).hasSize(1 + scenarios.size() * METHODS.size() * WEEKS);

        if (Boolean.getBoolean("sim.write")) {
            write("metrics.csv", metrics);
            write("comparison.csv", comparison);
        }
    }

    /** Per-learner scores of every method, for weeks 1..WEEKS. */
    private static Map<String, Map<Integer, List<Scores>>> evaluate(Scenario scenario) throws IOException {
        Map<String, List<Band>> bandsByUser = new HashMap<>();
        for (String[] c : rows("data/learner_sim/" + scenario.bandsFile())) {
            bandsByUser.computeIfAbsent(c[0], k -> new ArrayList<>())
                    .add(new Band(c[0], Instant.parse(c[2]), c[4], Double.parseDouble(c[5])));
        }
        LearnerProfileConfig config = new LearnerProfileConfig();
        config.setWeightClean(scenario.weightClean());
        SkillStateUpdater updater = new SkillStateUpdater(config);

        Map<String, Map<Integer, List<Scores>>> result = new LinkedHashMap<>();
        for (WeaknessRanker method : METHODS) {
            result.put(method.name(), new HashMap<>());
        }
        for (int week = 1; week <= WEEKS; week++) {
            Instant cutoff = START.plus(Duration.ofDays(7L * week));
            for (String user : users) {
                LearnerSnapshot snapshot = snapshot(user, cutoff, scenario, updater, bandsByUser.get(user));
                List<String> trueOrder = new ArrayList<>(subSkills);
                int w = week;
                trueOrder.sort(Comparator.comparingDouble(s -> truth.get(user + "|" + w + "|" + s)));
                Set<String> belowTarget = belowTarget(user, week);
                for (WeaknessRanker method : METHODS) {
                    Random tieBreak = new Random(SEED ^ (user + "|" + week + "|" + method.name()).hashCode());
                    List<String> ranking = method.rank(snapshot, structure, tieBreak);
                    result.get(method.name()).computeIfAbsent(week, k -> new ArrayList<>())
                            .add(score(ranking, trueOrder, belowTarget));
                }
            }
        }
        return result;
    }

    /** What the system knows about one learner before {@code cutoff}. */
    private static LearnerSnapshot snapshot(String user, Instant cutoff, Scenario scenario, SkillStateUpdater updater,
                                            List<Band> bands) {
        Map<String, SkillState> states = new HashMap<>();
        Map<String, Integer> errors = new HashMap<>();
        Map<String, List<Integer>> observations = new HashMap<>();
        String latestAttempt = null;
        for (Event e : eventsByUser.get(user)) {
            if (!e.time().isBefore(cutoff)) {
                break;
            }
            boolean drill = e.type() == EventType.DRILL;
            if (!drill || scenario.drillsCount()) {
                states.put(e.subSkill(), updater.update(states.get(e.subSkill()),
                        new ProfileEvent(user, e.time(), e.subSkill(), e.type(), e.outcome())));
            }
            if (!drill) {
                latestAttempt = e.source();
                observations.computeIfAbsent(e.subSkill(), k -> new ArrayList<>()).add(e.type() == EventType.ERROR ? 1 : 0);
                if (e.type() == EventType.ERROR) {
                    errors.merge(e.subSkill(), 1, Integer::sum);
                }
            }
        }
        Set<String> latestErrors = new HashSet<>();
        for (Event e : eventsByUser.get(user)) {
            if (e.source().equals(latestAttempt) && e.type() == EventType.ERROR) {
                latestErrors.add(e.subSkill());
            }
        }

        List<SubSkillEvidence> evidence = new ArrayList<>();
        for (String s : subSkills) {
            List<Integer> obs = observations.getOrDefault(s, List.of());
            List<Integer> recent = obs.subList(Math.max(0, obs.size() - RECENT), obs.size());
            SkillState state = states.get(s);
            evidence.add(new SubSkillEvidence(s, state != null ? state.mastery() : null, errors.getOrDefault(s, 0),
                    recent.stream().mapToInt(Integer::intValue).sum(), recent.size(), latestErrors.contains(s)));
        }

        // Current band of each Criterion: mean of its last bands before the cutoff
        Map<String, List<Double>> history = new HashMap<>();
        for (Band b : bands) {
            if (b.time().isBefore(cutoff)) {
                history.computeIfAbsent(b.criterion(), k -> new ArrayList<>()).add(b.band());
            }
        }
        Map<String, Double> criterionBands = new HashMap<>();
        history.forEach((criterion, list) -> criterionBands.put(criterion,
                mean(list.subList(Math.max(0, list.size() - RECENT), list.size()).stream()
                        .mapToDouble(Double::doubleValue).toArray())));
        return new LearnerSnapshot(evidence, criterionBands, targets.get(user));
    }

    /** SubSkills whose true mastery is below the level of the learner's target band, (target - 3.5) / 5. */
    private static Set<String> belowTarget(String user, int week) {
        Set<String> set = new HashSet<>();
        for (String s : subSkills) {
            double level = Double.NEGATIVE_INFINITY;
            for (String criterion : structure.criteriaOfSubSkill().getOrDefault(s, List.of())) {
                double target = targets.get(user).get(structure.skillOfCriterion().get(criterion));
                level = Math.max(level, (target - 3.5) / 5);
            }
            if (truth.get(user + "|" + week + "|" + s) < level) {
                set.add(s);
            }
        }
        return set;
    }

    private static Scores score(List<String> ranking, List<String> trueOrder, Set<String> belowTarget) {
        List<String> top = ranking.subList(0, TOP);
        Set<String> trueTop = new HashSet<>(trueOrder.subList(0, TOP));
        double precision = top.stream().filter(trueTop::contains).count() / (double) TOP;
        double hit = trueTop.contains(ranking.get(0)) ? 1 : 0;
        int n = ranking.size();
        double d2 = 0;
        for (int i = 0; i < n; i++) {
            double d = i - trueOrder.indexOf(ranking.get(i));
            d2 += d * d;
        }
        double spearman = 1 - 6 * d2 / (n * ((double) n * n - 1));
        Double below = belowTarget.isEmpty() ? null : top.stream().filter(belowTarget::contains).count() / (double) TOP;
        return new Scores(precision, hit, spearman, below);
    }

    /** Paired difference graph - baseline over the learners, with a 95% bootstrap interval. */
    private static String compare(String scenario, int week, String metric, List<Scores> graph, List<Scores> baseline,
                                  java.util.function.ToDoubleFunction<Scores> value) {
        double[] diff = new double[graph.size()];
        for (int i = 0; i < diff.length; i++) {
            diff[i] = value.applyAsDouble(graph.get(i)) - value.applyAsDouble(baseline.get(i));
        }
        Random rng = new Random(SEED + week * 31L + metric.hashCode() + scenario.hashCode());
        double[] means = new double[BOOTSTRAP];
        for (int b = 0; b < BOOTSTRAP; b++) {
            double sum = 0;
            for (int i = 0; i < diff.length; i++) {
                sum += diff[rng.nextInt(diff.length)];
            }
            means[b] = sum / diff.length;
        }
        Arrays.sort(means);
        double low = means[(int) (0.025 * BOOTSTRAP)];
        double high = means[(int) (0.975 * BOOTSTRAP) - 1];
        String verdict = low > 0 ? "graph_better" : high < 0 ? "graph_worse" : "no_clear_difference";
        return String.join(",", scenario, String.valueOf(week), metric, fmt(mean(diff)), fmt(low), fmt(high), verdict);
    }

    private static double mean(double[] values) {
        return values.length == 0 ? Double.NaN : Arrays.stream(values).average().orElseThrow();
    }

    private static List<String[]> rows(String relative) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (BufferedReader reader = Files.newBufferedReader(root.resolve(relative), StandardCharsets.UTF_8)) {
            reader.readLine();
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.isBlank()) {
                    rows.add(line.split(","));
                }
            }
        }
        return rows;
    }

    private static void write(String fileName, List<String> lines) throws IOException {
        Path dir = root.resolve("Evidence/W07");
        Files.createDirectories(dir);
        Path file = dir.resolve(fileName);
        Files.write(file, lines, StandardCharsets.UTF_8);
        System.out.println("Wrote " + file.toAbsolutePath().normalize());
    }

    private static String fmt(double value) {
        return Double.isNaN(value) ? "" : String.format(Locale.ROOT, "%.4f", value);
    }
}
