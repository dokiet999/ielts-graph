package com.ielts.backend.controller;

import com.ielts.backend.repository.EnrollmentRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Not transactional on purpose: the requests must commit in parallel to hit uq_enrollment.
 * The enrollment created here is removed after the test.
 */
@SpringBootTest
@AutoConfigureMockMvc
class EnrollConcurrencyTest {

    private static final UUID LISTENING_COURSE = UUID.fromString("10000000-0000-0000-0000-000000000002");
    private static final UUID STUDENT_NEW = UUID.fromString("00000000-0000-0000-0000-000000000012");
    private static final int REQUESTS = 8;

    @Autowired
    MockMvc mockMvc;

    @Autowired
    EnrollmentRepository enrollmentRepository;

    @AfterEach
    void cleanUp() {
        enrollmentRepository.findByUserIdAndCourseId(STUDENT_NEW, LISTENING_COURSE)
                .ifPresent(enrollmentRepository::delete);
    }

    @Test
    void concurrentEnrollRequests_createExactlyOneEnrollment_andNeverFail() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(REQUESTS);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Integer>> results = new ArrayList<>();
        try {
            for (int i = 0; i < REQUESTS; i++) {
                results.add(pool.submit(() -> {
                    start.await();
                    return mockMvc.perform(post("/api/courses/{id}/enroll", LISTENING_COURSE)
                                    .with(httpBasic("student_new", "Demo@123")))
                            .andReturn().getResponse().getStatus();
                }));
            }
            start.countDown();

            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> f : results) {
                statuses.add(f.get());
            }
            assertThat(statuses).allMatch(s -> s == 200 || s == 201);
            assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
            assertThat(enrollmentRepository.countByCourseIdAndIsActiveTrue(LISTENING_COURSE)).isEqualTo(1);
        } finally {
            pool.shutdownNow();
        }
    }
}
