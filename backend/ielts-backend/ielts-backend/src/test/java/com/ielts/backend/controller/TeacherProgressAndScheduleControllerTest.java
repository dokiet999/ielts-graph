package com.ielts.backend.controller;

import com.ielts.backend.entity.Category;
import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Lesson;
import com.ielts.backend.entity.Section;
import com.ielts.backend.entity.UserSubmission;
import com.ielts.backend.entity.Users;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.DifficultyLevel;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.GradingMethod;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.repository.CategoryRepository;
import com.ielts.backend.repository.CourseRepository;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.LessonRepository;
import com.ielts.backend.repository.SectionRepository;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TeacherProgressAndScheduleControllerTest {

    private static final String PASSWORD = "Demo@123";
    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    UserRepository userRepository;

    @Autowired
    CategoryRepository categoryRepository;

    @Autowired
    CourseRepository courseRepository;

    @Autowired
    SectionRepository sectionRepository;

    @Autowired
    LessonRepository lessonRepository;

    @Autowired
    ExerciseRepository exerciseRepository;

    @Autowired
    UserSubmissionRepository userSubmissionRepository;

    @Test
    void courseCapacityAndScheduleValidation_enforcesPreEnrollFullAndEndedRules() throws Exception {
        Category category = categoryRepository.findAll().stream().findFirst().orElseThrow();
        LocalDateTime futureStart = LocalDateTime.now().plusDays(3).withNano(0);
        LocalDateTime futureEnd = LocalDateTime.now().plusDays(30).withNano(0);

        // 1. Invalid date range (end <= start) -> 400 INVALID_DATE_RANGE
        mockMvc.perform(post("/api/teacher/courses")
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryId", category.getId(),
                                "title", "Scheduled Reading Cohort",
                                "skillFocus", "READING",
                                "difficultyLevel", "INTERMEDIATE",
                                "maxStudents", 1,
                                "startDate", futureEnd.format(ISO),
                                "endDate", futureStart.format(ISO)
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_DATE_RANGE"));

        // 2. Create course with optional capacity & future schedule
        String createdBody = mockMvc.perform(post("/api/teacher/courses")
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "categoryId", category.getId(),
                                "title", "Scheduled Reading Cohort",
                                "skillFocus", "READING",
                                "difficultyLevel", "INTERMEDIATE",
                                "maxStudents", 1,
                                "startDate", futureStart.format(ISO),
                                "endDate", futureEnd.format(ISO)
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.maxStudents").value(1))
                .andReturn().getResponse().getContentAsString();
        String courseId = objectMapper.readTree(createdBody).at("/data/id").asString();

        Course course = courseRepository.findById(java.util.UUID.fromString(courseId)).orElseThrow();
        course.setStatus(ContentStatus.APPROVED);
        course.setPublishedAt(LocalDateTime.now().minusHours(1));
        courseRepository.saveAndFlush(course);

        Section section = sectionRepository.saveAndFlush(Section.builder()
                .course(course)
                .title("Section 1")
                .ordering(1)
                .build());
        Lesson lesson = lessonRepository.saveAndFlush(Lesson.builder()
                .section(section)
                .title("Lesson 1")
                .lessonType("VIDEO")
                .ordering(1)
                .isPreview(false)
                .status(ContentStatus.APPROVED)
                .build());

        // 3. Before startDate: student_new can pre-enroll (201)
        mockMvc.perform(post("/api/courses/{id}/enroll", courseId)
                        .with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isCreated());

        // 4. Second student blocked by maxStudents = 1 -> 409 COURSE_FULL
        mockMvc.perform(post("/api/courses/{id}/enroll", courseId)
                        .with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_FULL"));

        // 5. Teacher cannot lower maxStudents below 1 active enrollment? Update to 2 works; past endDate blocks enroll
        // Pre-enrolled student cannot open non-preview lesson before startDate -> 409 COURSE_NOT_STARTED
        mockMvc.perform(get("/api/lessons/{id}", lesson.getId())
                        .with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_NOT_STARTED"));

        // 6. Move course endDate to the past -> existing student can open lesson, but cannot start/submit or new enroll
        course.setStartDate(LocalDateTime.now().minusDays(20));
        course.setEndDate(LocalDateTime.now().minusDays(1));
        course.setMaxStudents(10);
        courseRepository.saveAndFlush(course);

        mockMvc.perform(get("/api/lessons/{id}", lesson.getId())
                        .with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/courses/{id}/enroll", courseId)
                        .with(httpBasic("student_enrolled", PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("COURSE_ENDED"));
    }

    @Test
    void teacherProgressTrackingFinalTestUnlockAndSubmissionGrading_workEndToEnd() throws Exception {
        Users teacher = userRepository.findByUsername("teacher_demo").orElseThrow();
        Users student = userRepository.findByUsername("student_new").orElseThrow();
        Category category = categoryRepository.findAll().stream().findFirst().orElseThrow();

        Course course = courseRepository.saveAndFlush(Course.builder()
                .teacher(teacher)
                .category(category)
                .title("IELTS Writing Cohort")
                .skillFocus(SkillType.WRITING)
                .difficultyLevel(DifficultyLevel.INTERMEDIATE)
                .maxStudents(20)
                .startDate(LocalDateTime.now().minusDays(5))
                .endDate(LocalDateTime.now().plusDays(25))
                .status(ContentStatus.APPROVED)
                .publishedAt(LocalDateTime.now().minusDays(5))
                .isActive(true)
                .build());
        Section section = sectionRepository.saveAndFlush(Section.builder()
                .course(course)
                .title("Task 2 Essays")
                .ordering(1)
                .build());
        Lesson lesson = lessonRepository.saveAndFlush(Lesson.builder()
                .section(section)
                .title("Opinion Essay")
                .lessonType("VIDEO")
                .ordering(1)
                .isPreview(false)
                .status(ContentStatus.APPROVED)
                .build());
        Exercise writingEx = exerciseRepository.saveAndFlush(Exercise.builder()
                .lesson(lesson)
                .title("Task 2 Practice")
                .exerciseType(ExerciseType.PRACTICE)
                .skillType(SkillType.WRITING)
                .maxAttempts(3)
                .passingScore(BigDecimal.ZERO)
                .ordering(1)
                .build());
        Exercise finalTestEx = exerciseRepository.saveAndFlush(Exercise.builder()
                .lesson(lesson)
                .title("Section Final Test")
                .exerciseType(ExerciseType.FINAL_TEST)
                .skillType(SkillType.WRITING)
                .maxAttempts(1)
                .timeLimit(2400)
                .passingScore(BigDecimal.ZERO)
                .ordering(2)
                .build());

        UserSubmission submission = userSubmissionRepository.saveAndFlush(UserSubmission.builder()
                .user(student)
                .exercise(writingEx)
                .attemptNumber(1)
                .answers(Map.of("essayText", "Sample essay for teacher review."))
                .score(new BigDecimal("6.00"))
                .maxScore(new BigDecimal("9.00"))
                .aiScore(new BigDecimal("6.00"))
                .aiFeedback("Good structure, improve lexical variety.")
                .gradingMethod(GradingMethod.AI)
                .status(SubmissionStatus.GRADED)
                .submittedAt(LocalDateTime.now().minusHours(2))
                .build());

        mockMvc.perform(post("/api/courses/{id}/enroll", course.getId())
                        .with(httpBasic("student_new", PASSWORD)))
                .andExpect(status().isCreated());

        // 1. Teacher views class roster
        mockMvc.perform(get("/api/teacher/courses/{courseId}/students", course.getId())
                        .with(httpBasic("teacher_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activeStudentCount").value(1))
                .andExpect(jsonPath("$.data.students", hasSize(1)))
                .andExpect(jsonPath("$.data.students[0].studentId").value(student.getId().toString()))
                .andExpect(jsonPath("$.data.students[0].pendingReviewCount").value(1));

        // 2. Teacher unlocks Final Test for student
        mockMvc.perform(post("/api/teacher/courses/{courseId}/sections/{sectionId}/students/{studentId}/final-test/unlock",
                        course.getId(), section.getId(), student.getId())
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("deadlineDays", 14))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.exerciseId").value(finalTestEx.getId().toString()))
                .andExpect(jsonPath("$.data.unlocked").value(true))
                .andExpect(jsonPath("$.data.deadlineDays").value(14));

        // 3. Teacher grades & comments on submission
        mockMvc.perform(put("/api/teacher/submissions/{id}/feedback", submission.getId())
                        .with(httpBasic("teacher_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "teacherScore", 7.0,
                                "teacherFeedback", "Clear thesis and strong topic sentences."
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.teacherScore").value(7.0))
                .andExpect(jsonPath("$.data.score").value(7.0))
                .andExpect(jsonPath("$.data.aiScore").value(6.0))
                .andExpect(jsonPath("$.data.gradingMethod").value("TEACHER"))
                .andExpect(jsonPath("$.data.teacherFeedback").value("Clear thesis and strong topic sentences."));

        // 4. Student detail & Admin detail reflect teacher feedback and pendingReviewCount = 0
        mockMvc.perform(get("/api/admin/courses/{courseId}/students/{studentId}", course.getId(), student.getId())
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.submissions", hasSize(1)))
                .andExpect(jsonPath("$.data.submissions[0].teacherScore").value(7.0))
                .andExpect(jsonPath("$.data.sections[0].finalTest.unlocked").value(true));

        // 5. Student cannot self-unlock via legacy /api/sections/{id}/final-test/unlock or admin endpoint -> 403 Forbidden
        mockMvc.perform(post("/api/sections/{sectionId}/final-test/unlock", section.getId())
                        .with(httpBasic("student_new", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("deadlineDays", 7))))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/courses/{courseId}/sections/{sectionId}/students/{studentId}/final-test/unlock",
                        course.getId(), section.getId(), student.getId())
                        .with(httpBasic("student_new", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("deadlineDays", 7))))
                .andExpect(status().isForbidden());

        // 6. Admin can lock and unlock Final Test for student
        mockMvc.perform(post("/api/admin/courses/{courseId}/sections/{sectionId}/students/{studentId}/final-test/lock",
                        course.getId(), section.getId(), student.getId())
                        .with(httpBasic("admin_demo", PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unlocked").value(false));

        mockMvc.perform(post("/api/admin/courses/{courseId}/sections/{sectionId}/students/{studentId}/final-test/unlock",
                        course.getId(), section.getId(), student.getId())
                        .with(httpBasic("admin_demo", PASSWORD))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("deadlineDays", 30))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unlocked").value(true))
                .andExpect(jsonPath("$.data.deadlineDays").value(30));

        // 7. Unrelated teacher gets 403 Forbidden
        mockMvc.perform(get("/api/teacher/courses/{courseId}/students", course.getId())
                        .with(httpBasic("teacher_other", PASSWORD)))
                .andExpect(status().isForbidden());
    }
}
