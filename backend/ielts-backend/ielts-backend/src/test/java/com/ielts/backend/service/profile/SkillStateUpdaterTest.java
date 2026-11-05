package com.ielts.backend.service.profile;

import com.ielts.backend.config.LearnerProfileConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class SkillStateUpdaterTest {

    private SkillStateUpdater updater;

    @BeforeEach
    void setUp() {
        updater = new SkillStateUpdater(new LearnerProfileConfig());
    }

    @Test
    void update_followsRulesExampleTestVector() {
        // Section 5 test vector:
        // Step 0: mastery = 0.5, evidence = 0.0
        // Step 1: ERROR (outcome 0, w 1.0) -> mastery 0.3333, evidence 1.0
        // Step 2: ERROR -> mastery 0.2500, evidence 2.0
        // Step 3: DRILL (5/6, w 1.0) -> mastery 0.3667, evidence 3.0
        // Step 4: CLEAN (outcome 1, w 0.3) -> mastery 0.3983, evidence 3.3
        SkillState s = updater.initialState();
        assertThat(s.mastery()).isEqualTo(0.5);
        assertThat(s.evidence()).isEqualTo(0.0);
        assertThat(s.lastUpdate()).isNull();

        Instant t1 = Instant.parse("2026-09-07T10:00:00Z");
        s = updater.update(s, new ProfileEvent("u1", t1, "SUB_ARTICLE", EventType.ERROR, 0.0));
        assertThat(s.mastery()).isCloseTo(0.3333, within(0.0001));
        assertThat(s.evidence()).isCloseTo(1.0, within(1e-9));
        assertThat(s.lastUpdate()).isEqualTo(t1);

        Instant t2 = Instant.parse("2026-09-08T10:00:00Z");
        s = updater.update(s, new ProfileEvent("u1", t2, "SUB_ARTICLE", EventType.ERROR, 0.0));
        assertThat(s.mastery()).isCloseTo(0.2500, within(0.0001));
        assertThat(s.evidence()).isCloseTo(2.0, within(1e-9));

        Instant t3 = Instant.parse("2026-09-09T10:00:00Z");
        s = updater.update(s, new ProfileEvent("u1", t3, "SUB_ARTICLE", EventType.DRILL, 5.0 / 6.0));
        assertThat(s.mastery()).isCloseTo(0.3667, within(0.0001));
        assertThat(s.evidence()).isCloseTo(3.0, within(1e-9));

        Instant t4 = Instant.parse("2026-09-10T10:00:00Z");
        s = updater.update(s, new ProfileEvent("u1", t4, "SUB_ARTICLE", EventType.CLEAN, 1.0));
        assertThat(s.mastery()).isCloseTo(0.3983, within(0.0001));
        assertThat(s.evidence()).isCloseTo(3.3, within(1e-9));
        assertThat(s.lastUpdate()).isEqualTo(t4);
    }

    @Test
    void update_matchesSimUser001InteractionLogsVector() throws Exception {
        Path csvPath = resolveSimLogsPath();
        assertThat(csvPath).exists();

        Map<String, SkillState> states = new HashMap<>();
        int count = 0;

        try (BufferedReader reader = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
            String header = reader.readLine();
            assertThat(header).isNotNull();

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) {
                    continue;
                }
                String[] cols = line.split(",");
                String userId = cols[0];
                if (!"sim_user_001".equals(userId)) {
                    continue;
                }
                Instant time = Instant.parse(cols[1]);
                String subskillId = cols[2];
                EventType type = EventType.valueOf(cols[3]);
                double outcome = Double.parseDouble(cols[4]);

                ProfileEvent ev = new ProfileEvent(userId, time, subskillId, type, outcome);
                SkillState current = states.getOrDefault(subskillId, updater.initialState());
                states.put(subskillId, updater.update(current, ev));
                count++;
            }
        }

        assertThat(count).isEqualTo(288);

        assertSubSkill(states, "SUB_ARTICLE", 0.3557, 10.0);
        assertSubSkill(states, "SUB_VERB_TENSE", 0.5428, 7.9);
        assertSubSkill(states, "SUB_FLUENCY", 0.5750, 3.1);
        assertSubSkill(states, "SUB_AGREEMENT", 0.3958, 8.3);
    }

    @Test
    void update_masteryAlwaysStaysWithinZeroAndOne_andDirectionsMatchEventTypes() {
        Instant now = Instant.parse("2026-10-01T00:00:00Z");
        SkillState start = updater.initialState();

        SkillState afterError = updater.update(start, new ProfileEvent("u1", now, "SUB_ARTICLE", EventType.ERROR, 0.0));
        assertThat(afterError.mastery()).isLessThan(start.mastery()).isBetween(0.0, 1.0);

        SkillState afterClean = updater.update(start, new ProfileEvent("u1", now, "SUB_ARTICLE", EventType.CLEAN, 1.0));
        SkillState afterPerfectDrill = updater.update(start, new ProfileEvent("u1", now, "SUB_ARTICLE", EventType.DRILL, 1.0));
        assertThat(afterClean.mastery()).isGreaterThan(start.mastery());
        assertThat(afterPerfectDrill.mastery()).isGreaterThan(afterClean.mastery());

        SkillState afterLowDrill = updater.update(start, new ProfileEvent("u1", now, "SUB_ARTICLE", EventType.DRILL, 0.2));
        assertThat(afterLowDrill.mastery()).isLessThan(start.mastery()).isGreaterThan(0.2);
    }

    @Test
    void update_etaNeverDropsBelowEtaMinWhenEvidenceIsLarge() {
        Instant now = Instant.parse("2026-10-01T00:00:00Z");
        // With evidence = 1000, 1 / (1000 + 3) < 0.001, so eta must be clamped to ETA_MIN = 0.10.
        SkillState highEvidenceState = new SkillState(0.5, 1000.0, now);
        SkillState next = updater.update(
                highEvidenceState,
                new ProfileEvent("u1", now.plusSeconds(60), "SUB_ARTICLE", EventType.ERROR, 0.0)
        );
        // Expected: 0.5 + 1.0 * 0.10 * (0.0 - 0.5) = 0.45
        assertThat(next.mastery()).isCloseTo(0.45, within(1e-9));
        assertThat(next.evidence()).isCloseTo(1001.0, within(1e-9));
    }

    private static void assertSubSkill(
            Map<String, SkillState> states,
            String subskillId,
            double expectedMastery,
            double expectedEvidence
    ) {
        SkillState state = states.get(subskillId);
        assertThat(state).as("State for %s", subskillId).isNotNull();
        assertThat(state.mastery()).as("mastery of %s", subskillId).isCloseTo(expectedMastery, within(0.0001));
        assertThat(state.evidence()).as("evidence of %s", subskillId).isCloseTo(expectedEvidence, within(0.0001));
    }

    private static Path resolveSimLogsPath() {
        Path p = Paths.get("data/learner_sim/interaction_logs.csv");
        if (Files.exists(p)) {
            return p;
        }
        return Paths.get("../../../data/learner_sim/interaction_logs.csv").normalize();
    }
}

