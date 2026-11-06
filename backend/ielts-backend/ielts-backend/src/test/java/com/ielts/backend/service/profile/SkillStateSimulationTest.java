package com.ielts.backend.service.profile;

import com.ielts.backend.config.LearnerProfileConfig;
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
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeSet;
import java.util.function.Consumer;
import java.util.function.ObjDoubleConsumer;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Replays the synthetic learners (data/learner_sim) through {@link SkillStateUpdater} and compares the
 * estimated mastery with the hidden true mastery at the end of each week (docs/learner-profile-rules.md, section 8).
 * <p>
 * A normal test run only checks loose bounds. With {@code -Dsim.write=true} the metrics are also written to
 * Evidence/W06/metrics.csv and Evidence/W06/sensitivity.csv.
 */
class SkillStateSimulationTest {

    /** Start of the simulation; the week k snapshot holds every event with time < START + 7k days. */
    private static final Instant START = Instant.parse("2026-09-07T00:00:00Z");
    private static final int WEEKS = 8;
    private static final double BASELINE = 0.5;
    private static final int[] REPORTED_WEEKS = {4, 8};

    private static Path root;
    private static List<ProfileEvent> events;
    /** True mastery by "user|week|subskill". */
    private static Map<String, Double> truth;
    private static List<String> users;
    private static List<String> subskills;

    @BeforeAll
    static void loadData() throws IOException {
        root = Files.exists(Paths.get("data/learner_sim")) ? Paths.get("") : Paths.get("../../..");
        events = readEvents(root.resolve("data/learner_sim/interaction_logs.csv"));
        truth = new HashMap<>();
        TreeSet<String> userSet = new TreeSet<>();
        TreeSet<String> subskillSet = new TreeSet<>();
        for (String[] cols : readRows(root.resolve("data/learner_sim/true_mastery.csv"))) {
            truth.put(key(cols[0], Integer.parseInt(cols[1]), cols[2]), Double.parseDouble(cols[3]));
            userSet.add(cols[0]);
            subskillSet.add(cols[2]);
        }
        users = List.copyOf(userSet);
        subskills = List.copyOf(subskillSet);
    }

    @Test
    void defaultParameters_beatTheConstantBaselineAtWeek8() throws IOException {
        List<WeekMetrics> weeks = evaluate(new SkillStateUpdater(new LearnerProfileConfig()));

        assertThat(users).hasSize(60);
        assertThat(subskills).hasSize(25);
        // Week 0 holds no event: every estimate is the initial value, like the baseline
        assertThat(weeks.get(0).mae()).isEqualTo(weeks.get(0).baselineMae());
        assertThat(weeks.get(0).correlation()).isNull();

        WeekMetrics last = weeks.get(WEEKS);
        assertThat(last.correlation()).isGreaterThan(0.5);
        assertThat(last.mae()).isLessThan(last.baselineMae());

        if (Boolean.getBoolean("sim.write")) {
            List<String> lines = new ArrayList<>(List.of("week,mae,correlation,baseline_mae"));
            for (WeekMetrics w : weeks) {
                lines.add(w.week() + "," + fmt(w.mae()) + "," + fmt(w.correlation()) + "," + fmt(w.baselineMae()));
            }
            write("metrics.csv", lines);
            printByEventCount(new SkillStateUpdater(new LearnerProfileConfig()));
        }
    }

    @Test
    void sensitivity_oneParameterAtATime() throws IOException {
        List<String> lines = new ArrayList<>(List.of("parameter,value,week,mae,correlation"));
        sweep(lines, "etaMin", new double[]{0.05, 0.10, 0.20}, LearnerProfileConfig::setEtaMin);
        sweep(lines, "weightClean", new double[]{0.0, 0.15, 0.30, 0.60}, LearnerProfileConfig::setWeightClean);
        sweep(lines, "offset", new double[]{1, 3, 5, 10}, LearnerProfileConfig::setOffset);

        // 3 + 4 + 4 runs x 2 reported weeks, each with a correlation
        assertThat(lines).hasSize(1 + 11 * REPORTED_WEEKS.length);
        assertThat(lines).allSatisfy(line -> assertThat(line).doesNotEndWith(","));

        if (Boolean.getBoolean("sim.write")) {
            write("sensitivity.csv", lines);
        }
    }

    private static void sweep(List<String> lines, String parameter, double[] values,
                              ObjDoubleConsumer<LearnerProfileConfig> setter) {
        for (double value : values) {
            LearnerProfileConfig config = new LearnerProfileConfig();
            setter.accept(config, value);
            List<WeekMetrics> weeks = evaluate(new SkillStateUpdater(config));
            for (int week : REPORTED_WEEKS) {
                WeekMetrics w = weeks.get(week);
                lines.add(parameter + "," + fmt(value) + "," + week + "," + fmt(w.mae()) + "," + fmt(w.correlation()));
            }
        }
    }

    /** Metrics for weeks 0..WEEKS over all (user, SubSkill) pairs. */
    private static List<WeekMetrics> evaluate(SkillStateUpdater updater) {
        List<WeekMetrics> result = new ArrayList<>();
        for (int week = 0; week <= WEEKS; week++) {
            Map<String, SkillState> states = replay(updater, cutoff(week), null);
            double[] estimate = new double[users.size() * subskills.size()];
            double[] actual = new double[estimate.length];
            int i = 0;
            for (String user : users) {
                for (String subskill : subskills) {
                    SkillState state = states.get(user + "|" + subskill);
                    estimate[i] = state != null ? state.mastery() : updater.initialState().mastery();
                    actual[i] = truth.get(key(user, week, subskill));
                    i++;
                }
            }
            double[] baseline = new double[actual.length];
            Arrays.fill(baseline, BASELINE);
            result.add(new WeekMetrics(week, mae(estimate, actual), pearson(estimate, actual), mae(baseline, actual)));
        }
        return result;
    }

    /**
     * Applies every event before {@code cutoff}, in time order (file order for equal times), one state per
     * (user, SubSkill). Pairs without events are absent from the map. {@code onEvent} sees each applied pair key.
     */
    private static Map<String, SkillState> replay(SkillStateUpdater updater, Instant cutoff, Consumer<String> onEvent) {
        Map<String, SkillState> states = new HashMap<>();
        for (ProfileEvent event : events) {
            if (!event.time().isBefore(cutoff)) {
                continue;
            }
            String pair = event.userId() + "|" + event.subskillId();
            states.put(pair, updater.update(states.get(pair), event));
            if (onEvent != null) {
                onEvent.accept(pair);
            }
        }
        return states;
    }

    /** Week-8 MAE and correlation by the number of events of the pair, printed for the README. */
    private static void printByEventCount(SkillStateUpdater updater) {
        Map<String, Integer> counts = new HashMap<>();
        Map<String, SkillState> states = replay(updater, cutoff(WEEKS), pair -> counts.merge(pair, 1, Integer::sum));
        int[][] groups = {{0, 0}, {1, 4}, {5, 9}, {10, Integer.MAX_VALUE}};
        System.out.println("events_per_pair,pairs,mae,correlation (week " + WEEKS + ")");
        for (int[] group : groups) {
            List<Double> estimate = new ArrayList<>();
            List<Double> actual = new ArrayList<>();
            for (String user : users) {
                for (String subskill : subskills) {
                    String pair = user + "|" + subskill;
                    int n = counts.getOrDefault(pair, 0);
                    if (n < group[0] || n > group[1]) {
                        continue;
                    }
                    SkillState state = states.get(pair);
                    estimate.add(state != null ? state.mastery() : updater.initialState().mastery());
                    actual.add(truth.get(key(user, WEEKS, subskill)));
                }
            }
            String label = group[1] == Integer.MAX_VALUE ? group[0] + "+" : group[0] + "-" + group[1];
            double[] e = estimate.stream().mapToDouble(Double::doubleValue).toArray();
            double[] a = actual.stream().mapToDouble(Double::doubleValue).toArray();
            System.out.println(label + "," + e.length + "," + (e.length == 0 ? "" : fmt(mae(e, a))) + ","
                    + (e.length < 2 ? "" : fmt(pearson(e, a))));
        }
    }

    private static Instant cutoff(int week) {
        return START.plus(Duration.ofDays(7L * week));
    }

    private static double mae(double[] estimate, double[] actual) {
        double sum = 0;
        for (int i = 0; i < actual.length; i++) {
            sum += Math.abs(estimate[i] - actual[i]);
        }
        return sum / actual.length;
    }

    /** Pearson correlation, or null when one side is constant (week 0: every estimate is 0.5). */
    private static Double pearson(double[] x, double[] y) {
        double meanX = 0;
        double meanY = 0;
        for (int i = 0; i < x.length; i++) {
            meanX += x[i];
            meanY += y[i];
        }
        meanX /= x.length;
        meanY /= y.length;
        double cov = 0;
        double varX = 0;
        double varY = 0;
        for (int i = 0; i < x.length; i++) {
            cov += (x[i] - meanX) * (y[i] - meanY);
            varX += (x[i] - meanX) * (x[i] - meanX);
            varY += (y[i] - meanY) * (y[i] - meanY);
        }
        return varX == 0 || varY == 0 ? null : cov / Math.sqrt(varX * varY);
    }

    /** Events sorted by user then time; the sort is stable, so equal times keep the file order. */
    private static List<ProfileEvent> readEvents(Path csv) throws IOException {
        List<ProfileEvent> list = new ArrayList<>();
        for (String[] cols : readRows(csv)) {
            list.add(new ProfileEvent(cols[0], Instant.parse(cols[1]), cols[2],
                    EventType.valueOf(cols[3]), Double.parseDouble(cols[4])));
        }
        list.sort(Comparator.comparing(ProfileEvent::userId).thenComparing(ProfileEvent::time));
        return list;
    }

    private static List<String[]> readRows(Path csv) throws IOException {
        List<String[]> rows = new ArrayList<>();
        try (BufferedReader reader = Files.newBufferedReader(csv, StandardCharsets.UTF_8)) {
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
        Path dir = root.resolve("Evidence/W06");
        Files.createDirectories(dir);
        Path file = dir.resolve(fileName);
        Files.write(file, lines, StandardCharsets.UTF_8);
        System.out.println("Wrote " + file.toAbsolutePath().normalize());
    }

    private static String key(String user, int week, String subskill) {
        return user + "|" + week + "|" + subskill;
    }

    private static String fmt(Double value) {
        return value == null ? "" : String.format(Locale.ROOT, "%.4f", value);
    }

    private record WeekMetrics(int week, double mae, Double correlation, double baselineMae) {
    }
}
