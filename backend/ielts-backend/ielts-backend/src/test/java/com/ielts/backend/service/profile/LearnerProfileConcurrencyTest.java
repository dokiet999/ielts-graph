package com.ielts.backend.service.profile;

import com.ielts.backend.service.LearnerProfileService;
import com.ielts.backend.service.kg.KgGraphClient;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

/**
 * P0-3: two submissions of the same learner applied at the same time, on SubSkills the learner has no row for
 * yet. Before the fix both transactions inserted the row and one failed on the primary key.
 * Not @Transactional: the two applies must run in their own, really committed, transactions.
 */
@SpringBootTest
class LearnerProfileConcurrencyTest {

    private static final String WRITING = "40000000-0000-0000-0000-000000003001";
    private static final String STUDENT_NEW = "00000000-0000-0000-0000-000000000012";
    private static final List<String> SUBSKILLS = List.of("SS_TEST_RACE_A", "SS_TEST_RACE_B");

    @Autowired
    LearnerProfileService learnerProfileService;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @Autowired
    SkillStateUpdater skillStateUpdater;

    @MockitoBean
    KgGraphClient kgGraphClient;

    private final CyclicBarrier bothBuiltEvents = new CyclicBarrier(2);

    @BeforeEach
    @AfterEach
    void clean() {
        jdbcTemplate.update("DELETE FROM user_submissions WHERE user_id = ?::uuid AND exercise_id = ?::uuid",
                STUDENT_NEW, WRITING);
        jdbcTemplate.update("DELETE FROM learner_skill_state WHERE user_id = ?::uuid AND subskill_id LIKE 'SS_TEST_RACE_%'",
                STUDENT_NEW);
    }

    @Test
    void twoSubmissionsAppliedAtTheSameTime_bothUpdateTheProfile() throws Exception {
        // Both applies wait for each other after building their events, then enter their transactions together
        when(kgGraphClient.findSubSkillsByCriteria(anyList())).thenAnswer(inv -> {
            bothBuiltEvents.await(10, TimeUnit.SECONDS);
            return SUBSKILLS;
        });
        UUID first = insertGradedWriting(1);
        UUID second = insertGradedWriting(2);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<?> a = pool.submit(() -> learnerProfileService.applySubmission(first));
            Future<?> b = pool.submit(() -> learnerProfileService.applySubmission(second));
            a.get(30, TimeUnit.SECONDS);   // throws if the apply failed (for example on the primary key)
            b.get(30, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }

        Integer applied = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM user_submissions
                WHERE id IN (?, ?) AND profile_applied_at IS NOT NULL
                """, Integer.class, first, second);
        assertThat(applied).isEqualTo(2);
        for (String subskill : SUBSKILLS) {
            Double evidence = jdbcTemplate.queryForObject(
                    "SELECT evidence FROM learner_skill_state WHERE user_id = ?::uuid AND subskill_id = ?",
                    Double.class, STUDENT_NEW, subskill);
            // One CLEAN event per submission, each with the CLEAN weight: both were counted
            assertThat(evidence).isEqualTo(2 * skillStateUpdater.weightOf(EventType.CLEAN));
        }
    }

    private UUID insertGradedWriting(int attempt) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO user_submissions (id, user_id, exercise_id, attempt_number, status, score, max_score,
                                              ai_structured_feedback, graded_at, submitted_at)
                VALUES (?, ?::uuid, ?::uuid, ?, 'GRADED', 6.0, 9.0,
                        '{"criteria": {"CRIT_W_GRA": {"band": 6, "comment": "ok", "evidence": []}}}'::jsonb,
                        NOW(), NOW())
                """, id, STUDENT_NEW, WRITING, attempt);
        return id;
    }
}
