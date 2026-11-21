package com.ielts.backend.job;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** P0-5: submissions left in GRADING by a request that died are failed, and give their attempt back. */
@SpringBootTest
@Transactional
class StaleGradingJobTest {

    /** Writing Task 2 sample (V8). */
    private static final String WRITING = "40000000-0000-0000-0000-000000003001";
    private static final String STUDENT_NEW = "00000000-0000-0000-0000-000000000012";

    @Autowired
    StaleGradingJob job;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @BeforeEach
    void clean() {
        jdbcTemplate.update("DELETE FROM user_submissions WHERE user_id = ?::uuid AND exercise_id = ?::uuid",
                STUDENT_NEW, WRITING);
    }

    @Test
    void failsOnlySubmissionsGradingForLongerThanTheLimit() {
        UUID stale = insertGrading(1, "11 minutes");
        UUID recent = insertGrading(2, "1 minute");

        int changed = job.failStaleSubmissions();

        assertThat(changed).isGreaterThanOrEqualTo(1);
        assertThat(statusOf(stale)).isEqualTo("FAILED");
        assertThat(jdbcTemplate.queryForObject("SELECT ai_feedback FROM user_submissions WHERE id = ?",
                String.class, stale)).isEqualTo(StaleGradingJob.GRADING_TIMEOUT);
        // Still within the time a real grading can take: left alone
        assertThat(statusOf(recent)).isEqualTo("GRADING");
    }

    private UUID insertGrading(int attempt, String age) {
        UUID id = UUID.randomUUID();
        jdbcTemplate.update("""
                INSERT INTO user_submissions (id, user_id, exercise_id, attempt_number, status, submitted_at)
                VALUES (?, ?::uuid, ?::uuid, ?, 'GRADING', NOW() - ?::interval)
                """, id, STUDENT_NEW, WRITING, attempt, age);
        return id;
    }

    private String statusOf(UUID id) {
        return jdbcTemplate.queryForObject("SELECT status::text FROM user_submissions WHERE id = ?", String.class, id);
    }
}
