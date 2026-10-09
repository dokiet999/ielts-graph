package com.ielts.backend.controller;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Concurrent submissions compute the same attempt number. They must end as 200 or 409,
 * never as a 500 from uq_submission_attempt. Not transactional, so it cleans up after itself.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ReadingSubmitConcurrencyTest {

    private static final String READING = "d9f52c7a-9133-51eb-ad99-e9fef11162b4";
    private static final String STUDENT_NEW = "00000000-0000-0000-0000-000000000012";
    private static final int REQUESTS = 6;

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @AfterEach
    void cleanUp() {
        // question_answers are removed by ON DELETE CASCADE
        jdbcTemplate.update("DELETE FROM user_submissions WHERE user_id = ?::uuid AND exercise_id = ?::uuid",
                STUDENT_NEW, READING);
    }

    @Test
    void concurrentSubmissions_neverFailWith500() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(REQUESTS);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        try {
            for (int i = 0; i < REQUESTS; i++) {
                results.add(pool.submit(() -> {
                    start.await();
                    return mockMvc.perform(post("/api/reading/exercises/{id}/submit", READING)
                                    .with(httpBasic("student_new", "Demo@123"))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"answers\":{}}"))
                            .andReturn().getResponse().getStatus();
                }));
            }
            start.countDown();

            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> f : results) {
                statuses.add(f.get());
            }
            assertThat(statuses).allMatch(s -> s == 200 || s == 409);
            assertThat(statuses).contains(200);

            Integer saved = jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM user_submissions WHERE user_id = ?::uuid AND exercise_id = ?::uuid",
                    Integer.class, STUDENT_NEW, READING);
            assertThat(saved).isEqualTo((int) statuses.stream().filter(s -> s == 200).count());
        } finally {
            pool.shutdownNow();
        }
    }
}
