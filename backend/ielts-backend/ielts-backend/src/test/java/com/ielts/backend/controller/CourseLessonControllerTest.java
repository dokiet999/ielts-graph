package com.ielts.backend.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Uses the sample data from V2__seed_sample_courses.sql and V4__seed_demo_accounts.sql.
 * Each test runs in a transaction that is rolled back, so enrollments created here do not persist.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CourseLessonControllerTest {

    private static final String READING_COURSE = "10000000-0000-0000-0000-000000000001";
    private static final String LISTENING_COURSE = "10000000-0000-0000-0000-000000000002";
    private static final String INACTIVE_COURSE = "10000000-0000-0000-0000-000000000003";
    private static final String DRAFT_COURSE = "10000000-0000-0000-0000-000000000004";
    private static final String ACADEMIC_CATEGORY = "00000000-0000-0000-0000-0000000000c1";
    private static final String PREVIEW_LESSON = "30000000-0000-0000-0000-000000000111";
    private static final String TFNG_LESSON = "30000000-0000-0000-0000-000000000121";
    private static final String INACTIVE_LESSON = "30000000-0000-0000-0000-000000000311";
    private static final String DRAFT_PREVIEW_LESSON = "30000000-0000-0000-0000-000000000411";
    private static final String UNKNOWN_ID = "99999999-9999-9999-9999-999999999999";
    private static final String PASSWORD = "Demo@123";

    @Autowired
    MockMvc mockMvc;

    // ---------- Course listing ----------

    @Test
    void listCourses_returnsOnlyPublishedActiveCourses_newestFirst() throws Exception {
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.content[*].id").value(contains(LISTENING_COURSE, READING_COURSE)))
                .andExpect(jsonPath("$.content[*].id").value(not(hasItem(INACTIVE_COURSE))))
                .andExpect(jsonPath("$.content[*].id").value(not(hasItem(DRAFT_COURSE))))
                .andExpect(jsonPath("$.content[0].teacherName").value("Demo Teacher"));
    }

    @Test
    void listCourses_enrollmentCountComesFromEnrollments() throws Exception {
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[?(@.id == '" + READING_COURSE + "')].enrollmentCount").value(contains(1)))
                // V6 enrolls student_enrolled in the Listening course
                .andExpect(jsonPath("$.content[?(@.id == '" + LISTENING_COURSE + "')].enrollmentCount").value(contains(1)));
    }

    @Test
    void listCourses_filtersBySkill() throws Exception {
        mockMvc.perform(get("/api/courses").param("skill", "READING"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(READING_COURSE))
                .andExpect(jsonPath("$.content[0].categoryName").value("Academic"));
    }

    @Test
    void listCourses_filtersByCategory() throws Exception {
        mockMvc.perform(get("/api/courses").param("categoryId", ACADEMIC_CATEGORY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void listCourses_filtersByLevel() throws Exception {
        mockMvc.perform(get("/api/courses").param("level", "ELEMENTARY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(LISTENING_COURSE));
    }

    @Test
    void listCourses_searchesTitleCaseInsensitive() throws Exception {
        mockMvc.perform(get("/api/courses").param("q", "  reading "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].id").value(READING_COURSE));
    }

    @Test
    void listCourses_treatsLikeWildcardsLiterally() throws Exception {
        mockMvc.perform(get("/api/courses").param("q", "%"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void listCourses_combinesFilters() throws Exception {
        mockMvc.perform(get("/api/courses").param("skill", "READING").param("level", "ELEMENTARY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(0));
    }

    @Test
    void listCourses_blankKeywordIsIgnored() throws Exception {
        mockMvc.perform(get("/api/courses").param("q", "   "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void listCourses_paginates() throws Exception {
        mockMvc.perform(get("/api/courses").param("page", "0").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.totalElements").value(2))
                .andExpect(jsonPath("$.totalPages").value(2));
    }

    @Test
    void listCourses_invalidSkill_returns400() throws Exception {
        mockMvc.perform(get("/api/courses").param("skill", "COOKING"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    @Test
    void listCourses_invalidLevel_returns400() throws Exception {
        mockMvc.perform(get("/api/courses").param("level", "EXPERT"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    // ---------- Course detail ----------

    @Test
    void courseDetail_returnsSectionsAndLessonsInOrder() throws Exception {
        mockMvc.perform(get("/api/courses/{id}", READING_COURSE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.course.title").value("IELTS Reading Foundations"))
                .andExpect(jsonPath("$.totalLessons").value(4))
                .andExpect(jsonPath("$.sections[*].title").value(contains("Getting started", "Question types")))
                .andExpect(jsonPath("$.sections[0].lessons[*].title")
                        .value(contains("Introduction to IELTS Reading", "Skimming and scanning")))
                .andExpect(jsonPath("$.sections[1].lessons[*].title")
                        .value(contains("True / False / Not Given", "Matching headings")));
    }

    @Test
    void courseDetail_inactiveCourse_returns404() throws Exception {
        mockMvc.perform(get("/api/courses/{id}", INACTIVE_COURSE))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void courseDetail_draftCourse_returns404() throws Exception {
        mockMvc.perform(get("/api/courses/{id}", DRAFT_COURSE))
                .andExpect(status().isNotFound());
    }

    @Test
    void courseDetail_unknownId_returns404() throws Exception {
        mockMvc.perform(get("/api/courses/{id}", UNKNOWN_ID))
                .andExpect(status().isNotFound());
    }

    @Test
    void courseDetail_malformedId_returns400() throws Exception {
        mockMvc.perform(get("/api/courses/{id}", "not-a-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    // ---------- Lesson listing ----------

    @Test
    void courseLessons_returnsFlatListOrderedBySectionThenLesson() throws Exception {
        mockMvc.perform(get("/api/courses/{id}/lessons", READING_COURSE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[*].title").value(contains(
                        "Introduction to IELTS Reading",
                        "Skimming and scanning",
                        "True / False / Not Given",
                        "Matching headings")));
    }

    @Test
    void courseLessons_inactiveCourse_returns404() throws Exception {
        mockMvc.perform(get("/api/courses/{id}/lessons", INACTIVE_COURSE))
                .andExpect(status().isNotFound());
    }

    @Test
    void courseLessons_draftCourse_returns404() throws Exception {
        mockMvc.perform(get("/api/courses/{id}/lessons", DRAFT_COURSE))
                .andExpect(status().isNotFound());
    }

    // ---------- Lesson detail and access control (FR-2.01) ----------

    @Test
    void lessonDetail_previewLesson_isPublic() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", PREVIEW_LESSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lesson.isPreview").value(true))
                .andExpect(jsonPath("$.lesson.videoUrl").value("https://example.com/videos/reading-intro.mp4"));
    }

    @Test
    void lessonDetail_anonymous_returns401() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", TFNG_LESSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void lessonDetail_studentNotEnrolled_returns403() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", TFNG_LESSON).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void lessonDetail_enrolledStudent_returnsContentAndExercises() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", TFNG_LESSON).with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lesson.title").value("True / False / Not Given"))
                .andExpect(jsonPath("$.lesson.documentUrl").value("https://example.com/docs/tfng.pdf"))
                .andExpect(jsonPath("$.courseId").value(READING_COURSE))
                .andExpect(jsonPath("$.sectionTitle").value("Question types"))
                .andExpect(jsonPath("$.exercises[*].title").value(contains("TFNG practice 1", "TFNG practice 2")))
                .andExpect(jsonPath("$.exercises[0].skillType").value("READING"));
    }

    @Test
    void lessonDetail_owningTeacher_canOpen() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", TFNG_LESSON).with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk());
    }

    @Test
    void lessonDetail_otherTeacher_returns403() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", TFNG_LESSON).with(httpBasic("teacher_other", PASSWORD)))
                .andExpect(status().isForbidden());
    }

    @Test
    void lessonDetail_wrongPassword_returns401() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", TFNG_LESSON).with(httpBasic("student_enrolled", "wrong")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void login_isCaseInsensitive() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", TFNG_LESSON).with(httpBasic("Student_Enrolled", PASSWORD)))
                .andExpect(status().isOk());
    }

    @Test
    void lockedAccount_correctPassword_returnsAccountLocked() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", TFNG_LESSON).with(httpBasic("student_locked", PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_LOCKED"));
    }

    @Test
    void lockedAccount_wrongPassword_doesNotRevealStatus() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", TFNG_LESSON).with(httpBasic("student_locked", "wrong")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void pendingTeacher_returnsAccountPending() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", TFNG_LESSON).with(httpBasic("teacher_pending", PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("ACCOUNT_PENDING"));
    }

    @Test
    void lessonDetail_lessonOfInactiveCourse_returns404() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", INACTIVE_LESSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void lessonDetail_previewLessonOfDraftCourse_returns404() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", DRAFT_PREVIEW_LESSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void lessonDetail_unknownId_returns404() throws Exception {
        mockMvc.perform(get("/api/lessons/{id}", UNKNOWN_ID))
                .andExpect(status().isNotFound());
    }

    // ---------- Enrollment (UC07) ----------

    @Test
    void enroll_thenLessonOpens() throws Exception {
        mockMvc.perform(post("/api/courses/{id}/enroll", READING_COURSE).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.courseId").value(READING_COURSE))
                .andExpect(jsonPath("$.progressPercentage").value(0))
                .andExpect(jsonPath("$.created").value(true));

        mockMvc.perform(get("/api/lessons/{id}", TFNG_LESSON).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/courses/{id}", READING_COURSE))
                .andExpect(jsonPath("$.course.enrollmentCount").value(2));
    }

    @Test
    void enroll_twice_isIdempotent() throws Exception {
        mockMvc.perform(post("/api/courses/{id}/enroll", READING_COURSE).with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("50000000-0000-0000-0000-000000000001"))
                .andExpect(jsonPath("$.created").value(false));
    }

    @Test
    void enroll_anonymous_returns401() throws Exception {
        mockMvc.perform(post("/api/courses/{id}/enroll", READING_COURSE))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void enroll_teacher_returns403() throws Exception {
        mockMvc.perform(post("/api/courses/{id}/enroll", READING_COURSE).with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    void enroll_draftCourse_returns404() throws Exception {
        mockMvc.perform(post("/api/courses/{id}/enroll", DRAFT_COURSE).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isNotFound());
    }

    // ---------- Error format for framework errors ----------

    @Test
    void unknownPath_returns404NotFound() throws Exception {
        mockMvc.perform(get("/api/courses/{id}/unknown", READING_COURSE))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void wrongHttpMethod_returns405() throws Exception {
        mockMvc.perform(post("/api/courses/{id}", READING_COURSE).with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"))
                .andExpect(jsonPath("$.message").value("Method Not Allowed"));
    }
}
