package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.ReplaceExerciseQuestionsRequest;
import com.ielts.backend.dto.request.ReplaceExerciseQuestionsRequest.QuestionGroupInput;
import com.ielts.backend.dto.request.ReplaceExerciseQuestionsRequest.QuestionInput;
import com.ielts.backend.dto.request.ReplaceExerciseQuestionsRequest.QuestionOptionInput;
import com.ielts.backend.dto.request.TeacherExerciseRequest;
import com.ielts.backend.dto.response.TeacherExerciseDetailResponse;
import com.ielts.backend.dto.response.TeacherExerciseDetailResponse.TeacherQuestionGroupResponse;
import com.ielts.backend.dto.response.TeacherExerciseDetailResponse.TeacherQuestionOptionResponse;
import com.ielts.backend.dto.response.TeacherExerciseDetailResponse.TeacherQuestionResponse;
import com.ielts.backend.dto.response.TeacherLessonExercisesResponse;
import com.ielts.backend.dto.response.TeacherLessonExercisesResponse.TeacherExerciseSummaryResponse;
import com.ielts.backend.entity.Course;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Lesson;
import com.ielts.backend.entity.Question;
import com.ielts.backend.entity.QuestionGroup;
import com.ielts.backend.entity.QuestionOption;
import com.ielts.backend.entity.Section;
import com.ielts.backend.entity.Users;
import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.QuestionType;
import com.ielts.backend.exception.customException.BadRequestException;
import com.ielts.backend.exception.customException.ConflictException;
import com.ielts.backend.exception.customException.ForbiddenException;
import com.ielts.backend.exception.customException.ResourceNotFoundException;
import com.ielts.backend.exception.customException.UnauthorizedException;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.LessonRepository;
import com.ielts.backend.repository.QuestionGroupRepository;
import com.ielts.backend.repository.QuestionOptionRepository;
import com.ielts.backend.repository.QuestionRepository;
import com.ielts.backend.repository.QuestionRepository.ExerciseQuestionStats;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.repository.UserSubmissionRepository.ExerciseSubmissionCount;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.TeacherExerciseService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class TeacherExerciseServiceImpl implements TeacherExerciseService {

    private static final Set<QuestionType> OBJECTIVE_CHOICE_TYPES = Set.of(
            QuestionType.MULTIPLE_CHOICE,
            QuestionType.DROPLIST,
            QuestionType.TRUE_FALSE,
            QuestionType.MATCHING
    );

    private final UserRepository userRepository;
    private final LessonRepository lessonRepository;
    private final ExerciseRepository exerciseRepository;
    private final QuestionGroupRepository questionGroupRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final UserSubmissionRepository userSubmissionRepository;

    @Override
    @Transactional(readOnly = true)
    public TeacherLessonExercisesResponse getLessonExercises(UUID lessonId, String teacherUsername) {
        Lesson lesson = findOwnedLesson(lessonId, teacherUsername);
        Section section = lesson.getSection();
        Course course = section.getCourse();

        List<Exercise> exercises = exerciseRepository.findByLessonIdOrderByOrderingAsc(lessonId);
        List<UUID> exerciseIds = exercises.stream().map(Exercise::getId).toList();

        Map<UUID, Long> questionCounts = exerciseIds.isEmpty() ? Map.of()
                : questionRepository.summarizeByExerciseIds(exerciseIds).stream()
                        .collect(Collectors.toMap(
                                ExerciseQuestionStats::getExerciseId,
                                ExerciseQuestionStats::getQuestionCount));
        Map<UUID, Long> submissionCounts = exerciseIds.isEmpty() ? Map.of()
                : userSubmissionRepository.countByExerciseIds(exerciseIds).stream()
                        .collect(Collectors.toMap(
                                ExerciseSubmissionCount::getExerciseId,
                                ExerciseSubmissionCount::getTotal));

        List<TeacherExerciseSummaryResponse> items = exercises.stream()
                .map(ex -> TeacherExerciseSummaryResponse.builder()
                        .id(ex.getId())
                        .lessonId(lesson.getId())
                        .title(ex.getTitle())
                        .instruction(ex.getInstruction())
                        .audioUrl(ex.getAudioUrl())
                        .exerciseType(ex.getExerciseType())
                        .skillType(ex.getSkillType())
                        .timeLimit(ex.getTimeLimit())
                        .maxAttempts(ex.getMaxAttempts())
                        .passingScore(ex.getPassingScore())
                        .ordering(ex.getOrdering())
                        .questionCount(questionCounts.getOrDefault(ex.getId(), 0L))
                        .submissionCount(submissionCounts.getOrDefault(ex.getId(), 0L))
                        .createdAt(ex.getCreatedAt())
                        .updatedAt(ex.getUpdatedAt())
                        .build())
                .toList();

        return TeacherLessonExercisesResponse.builder()
                .lessonId(lesson.getId())
                .lessonTitle(lesson.getTitle())
                .lessonStatus(lesson.getStatus())
                .sectionId(section.getId())
                .sectionTitle(section.getTitle())
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .courseStatus(course.getStatus())
                .courseSkillFocus(course.getSkillFocus())
                .exercises(items)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public TeacherExerciseDetailResponse getExerciseDetail(UUID exerciseId, String teacherUsername) {
        Exercise exercise = findOwnedExercise(exerciseId, teacherUsername);
        return buildExerciseDetail(exercise);
    }

    @Override
    public TeacherExerciseDetailResponse createExercise(
            UUID lessonId, String teacherUsername, TeacherExerciseRequest request) {
        Lesson lesson = findOwnedLesson(lessonId, teacherUsername);
        ensureLessonNotFrozen(lesson);

        int ordering = request.getOrdering() != null
                ? request.getOrdering()
                : exerciseRepository.findMaxOrderingByLessonId(lessonId) + 1;

        Exercise exercise = Exercise.builder()
                .lesson(lesson)
                .title(request.getTitle().trim())
                .instruction(trimToNull(request.getInstruction()))
                .audioUrl(trimToNull(request.getAudioUrl()))
                .content(request.getContent())
                .exerciseType(request.getExerciseType())
                .skillType(request.getSkillType())
                .timeLimit(request.getTimeLimit())
                .maxAttempts(request.getMaxAttempts() != null ? request.getMaxAttempts() : 1)
                .passingScore(request.getPassingScore() != null ? request.getPassingScore() : BigDecimal.ZERO)
                .ordering(ordering)
                .build();

        Exercise saved = exerciseRepository.saveAndFlush(exercise);
        return buildExerciseDetail(saved);
    }

    @Override
    public TeacherExerciseDetailResponse updateExercise(
            UUID exerciseId, String teacherUsername, TeacherExerciseRequest request) {
        Exercise exercise = findOwnedExercise(exerciseId, teacherUsername);
        ensureLessonNotFrozen(exercise.getLesson());

        boolean hasSubmissions = userSubmissionRepository.existsByExerciseId(exerciseId);
        if (hasSubmissions && (request.getExerciseType() != exercise.getExerciseType()
                || request.getSkillType() != exercise.getSkillType())) {
            throw new ConflictException("EXERCISE_HAS_SUBMISSIONS",
                    "Cannot change exercise type or skill after learners have submitted attempts");
        }

        exercise.setTitle(request.getTitle().trim());
        exercise.setInstruction(trimToNull(request.getInstruction()));
        exercise.setAudioUrl(trimToNull(request.getAudioUrl()));
        if (request.getContent() != null) {
            exercise.setContent(request.getContent());
        }
        exercise.setTimeLimit(request.getTimeLimit());
        exercise.setMaxAttempts(request.getMaxAttempts() != null ? request.getMaxAttempts() : 1);
        exercise.setPassingScore(request.getPassingScore() != null ? request.getPassingScore() : BigDecimal.ZERO);
        if (request.getOrdering() != null) {
            exercise.setOrdering(request.getOrdering());
        }
        if (!hasSubmissions) {
            exercise.setExerciseType(request.getExerciseType());
            exercise.setSkillType(request.getSkillType());
        }

        Exercise saved = exerciseRepository.saveAndFlush(exercise);
        return buildExerciseDetail(saved);
    }

    @Override
    public void deleteExercise(UUID exerciseId, String teacherUsername) {
        Exercise exercise = findOwnedExercise(exerciseId, teacherUsername);
        ensureLessonNotFrozen(exercise.getLesson());

        if (userSubmissionRepository.existsByExerciseId(exerciseId)) {
            throw new ConflictException("EXERCISE_HAS_SUBMISSIONS",
                    "Cannot delete an exercise that already has student submissions");
        }

        exerciseRepository.delete(exercise);
        exerciseRepository.flush();
    }

    @Override
    public TeacherExerciseDetailResponse replaceQuestions(
            UUID exerciseId, String teacherUsername, ReplaceExerciseQuestionsRequest request) {
        Exercise exercise = findOwnedExercise(exerciseId, teacherUsername);
        ensureLessonNotFrozen(exercise.getLesson());

        if (userSubmissionRepository.existsByExerciseId(exerciseId)) {
            throw new ConflictException("EXERCISE_HAS_SUBMISSIONS",
                    "Cannot modify question structure or answers after learners have submitted attempts");
        }

        List<QuestionGroupInput> groupInputs = request.getQuestionGroups() != null
                ? request.getQuestionGroups()
                : List.of();
        validateQuestionTree(groupInputs);

        questionOptionRepository.deleteByExerciseId(exerciseId);
        questionRepository.deleteByExerciseId(exerciseId);
        questionGroupRepository.deleteByExerciseId(exerciseId);

        Exercise managedExercise = exerciseRepository.getReferenceById(exerciseId);

        int nextQuestionOrder = 1;
        for (int gIdx = 0; gIdx < groupInputs.size(); gIdx++) {
            QuestionGroupInput gIn = groupInputs.get(gIdx);
            List<QuestionInput> qInputs = gIn.getQuestions();

            QuestionType groupType = gIn.getQuestionType() != null
                    ? gIn.getQuestionType()
                    : qInputs.get(0).getQuestionType();
            int groupOrder = gIn.getOrdering() != null && gIn.getOrdering() > 0
                    ? gIn.getOrdering()
                    : gIdx + 1;

            int firstQuestionOrder = qInputs.get(0).getOrdering() != null && qInputs.get(0).getOrdering() > 0
                    ? qInputs.get(0).getOrdering()
                    : nextQuestionOrder;
            int lastQuestionOrder = firstQuestionOrder;

            List<Integer> resolvedQuestionOrders = new ArrayList<>(qInputs.size());
            for (QuestionInput qIn : qInputs) {
                int qOrder = qIn.getOrdering() != null && qIn.getOrdering() > 0
                        ? qIn.getOrdering()
                        : nextQuestionOrder;
                nextQuestionOrder = Math.max(nextQuestionOrder + 1, qOrder + 1);
                lastQuestionOrder = Math.max(lastQuestionOrder, qOrder);
                resolvedQuestionOrders.add(qOrder);
            }

            String range = trimToNull(gIn.getQuestionRange());
            if (range == null) {
                range = firstQuestionOrder == lastQuestionOrder
                        ? String.valueOf(firstQuestionOrder)
                        : firstQuestionOrder + "-" + lastQuestionOrder;
            }

            QuestionGroup savedGroup = questionGroupRepository.save(QuestionGroup.builder()
                    .exercise(managedExercise)
                    .groupTitle(trimToNull(gIn.getGroupTitle()))
                    .groupInstruction(trimToNull(gIn.getGroupInstruction()))
                    .passageReference(trimToNull(gIn.getPassageReference()))
                    .imageUrl(trimToNull(gIn.getImageUrl()))
                    .questionType(groupType)
                    .questionRange(range)
                    .correctAnswerCount(qInputs.size())
                    .ordering(groupOrder)
                    .build());

            for (int qIdx = 0; qIdx < qInputs.size(); qIdx++) {
                QuestionInput qIn = qInputs.get(qIdx);
                BigDecimal qPoints = qIn.getPoints() != null ? qIn.getPoints() : BigDecimal.ONE;

                Question savedQuestion = questionRepository.save(Question.builder()
                        .exercise(managedExercise)
                        .questionGroup(savedGroup)
                        .questionText(qIn.getQuestionText().trim())
                        .questionType(qIn.getQuestionType())
                        .imageUrl(trimToNull(qIn.getImageUrl()))
                        .audioUrl(trimToNull(qIn.getAudioUrl()))
                        .readingPassage(trimToNull(qIn.getReadingPassage()))
                        .explanation(trimToNull(qIn.getExplanation()))
                        .points(qPoints)
                        .ordering(resolvedQuestionOrders.get(qIdx))
                        .build());

                List<QuestionOptionInput> optInputs = qIn.getOptions() != null ? qIn.getOptions() : List.of();
                for (int oIdx = 0; oIdx < optInputs.size(); oIdx++) {
                    QuestionOptionInput optIn = optInputs.get(oIdx);
                    boolean isCorrect = qIn.getQuestionType() == QuestionType.FILL_BLANK
                            || Boolean.TRUE.equals(optIn.getIsCorrect());
                    BigDecimal optPoint = optIn.getPoint() != null
                            ? optIn.getPoint()
                            : (isCorrect ? qPoints : BigDecimal.ZERO);
                    int optOrder = optIn.getOrdering() != null && optIn.getOrdering() > 0
                            ? optIn.getOrdering()
                            : oIdx + 1;

                    questionOptionRepository.save(QuestionOption.builder()
                            .question(savedQuestion)
                            .optionText(optIn.getOptionText().trim())
                            .isCorrect(isCorrect)
                            .point(optPoint)
                            .explanation(trimToNull(optIn.getExplanation()))
                            .ordering(optOrder)
                            .build());
                }
            }
        }

        questionOptionRepository.flush();
        questionRepository.flush();
        questionGroupRepository.flush();

        Exercise reloaded = exerciseRepository.findByIdWithFullHierarchy(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise", exerciseId));
        return buildExerciseDetail(reloaded);
    }

    private TeacherExerciseDetailResponse buildExerciseDetail(Exercise exercise) {
        UUID id = exercise.getId();
        Lesson lesson = exercise.getLesson();
        Section section = lesson.getSection();
        Course course = section.getCourse();

        List<QuestionGroup> groups = questionGroupRepository.findByExerciseIdOrderByOrderingAsc(id);
        List<Question> questions = questionRepository.findByExerciseIdOrderByOrderingAsc(id);
        List<UUID> questionIds = questions.stream().map(Question::getId).toList();
        List<QuestionOption> options = questionIds.isEmpty()
                ? Collections.emptyList()
                : questionOptionRepository.findByQuestionIdInOrderByOrderingAsc(questionIds);

        Map<UUID, List<Question>> questionsByGroup = new HashMap<>();
        List<Question> ungrouped = new ArrayList<>();
        for (Question q : questions) {
            if (q.getQuestionGroup() != null) {
                questionsByGroup.computeIfAbsent(q.getQuestionGroup().getId(), k -> new ArrayList<>()).add(q);
            } else {
                ungrouped.add(q);
            }
        }

        Map<UUID, List<QuestionOption>> optionsByQuestion = new HashMap<>();
        for (QuestionOption opt : options) {
            optionsByQuestion.computeIfAbsent(opt.getQuestion().getId(), k -> new ArrayList<>()).add(opt);
        }

        List<TeacherQuestionGroupResponse> groupResponses = new ArrayList<>();
        for (QuestionGroup g : groups) {
            List<Question> gQuestions = questionsByGroup.getOrDefault(g.getId(), Collections.emptyList());
            groupResponses.add(TeacherQuestionGroupResponse.builder()
                    .id(g.getId())
                    .groupTitle(g.getGroupTitle())
                    .groupInstruction(g.getGroupInstruction())
                    .passageReference(g.getPassageReference())
                    .imageUrl(g.getImageUrl())
                    .questionType(g.getQuestionType())
                    .questionRange(g.getQuestionRange())
                    .ordering(g.getOrdering())
                    .questions(mapQuestions(gQuestions, optionsByQuestion))
                    .build());
        }

        if (!ungrouped.isEmpty()) {
            groupResponses.add(TeacherQuestionGroupResponse.builder()
                    .id(null)
                    .groupTitle("Câu hỏi")
                    .questionType(ungrouped.get(0).getQuestionType())
                    .ordering(groupResponses.size() + 1)
                    .questions(mapQuestions(ungrouped, optionsByQuestion))
                    .build());
        }

        long submissionCount = userSubmissionRepository.countByExerciseId(id);

        return TeacherExerciseDetailResponse.builder()
                .id(exercise.getId())
                .lessonId(lesson.getId())
                .lessonTitle(lesson.getTitle())
                .lessonStatus(lesson.getStatus())
                .sectionId(section.getId())
                .sectionTitle(section.getTitle())
                .courseId(course.getId())
                .courseTitle(course.getTitle())
                .courseStatus(course.getStatus())
                .title(exercise.getTitle())
                .instruction(exercise.getInstruction())
                .audioUrl(exercise.getAudioUrl())
                .content(exercise.getContent())
                .exerciseType(exercise.getExerciseType())
                .skillType(exercise.getSkillType())
                .timeLimit(exercise.getTimeLimit())
                .maxAttempts(exercise.getMaxAttempts())
                .passingScore(exercise.getPassingScore())
                .ordering(exercise.getOrdering())
                .submissionCount(submissionCount)
                .totalQuestions(questions.size())
                .questionGroups(groupResponses)
                .createdAt(exercise.getCreatedAt())
                .updatedAt(exercise.getUpdatedAt())
                .build();
    }

    private static List<TeacherQuestionResponse> mapQuestions(
            List<Question> questions, Map<UUID, List<QuestionOption>> optionsByQuestion) {
        return questions.stream().map(q -> {
            List<QuestionOption> qOpts = optionsByQuestion.getOrDefault(q.getId(), Collections.emptyList());
            List<TeacherQuestionOptionResponse> optResponses = qOpts.stream()
                    .map(opt -> TeacherQuestionOptionResponse.builder()
                            .id(opt.getId())
                            .optionText(opt.getOptionText())
                            .isCorrect(Boolean.TRUE.equals(opt.getIsCorrect()))
                            .point(opt.getPoint())
                            .explanation(opt.getExplanation())
                            .ordering(opt.getOrdering())
                            .build())
                    .toList();
            return TeacherQuestionResponse.builder()
                    .id(q.getId())
                    .questionText(q.getQuestionText())
                    .questionType(q.getQuestionType())
                    .imageUrl(q.getImageUrl())
                    .audioUrl(q.getAudioUrl())
                    .readingPassage(q.getReadingPassage())
                    .explanation(q.getExplanation())
                    .points(q.getPoints())
                    .ordering(q.getOrdering())
                    .options(optResponses)
                    .build();
        }).toList();
    }

    private static void validateQuestionTree(List<QuestionGroupInput> groupInputs) {
        for (int gIdx = 0; gIdx < groupInputs.size(); gIdx++) {
            QuestionGroupInput gIn = groupInputs.get(gIdx);
            List<QuestionInput> qInputs = gIn.getQuestions();
            if (qInputs == null || qInputs.isEmpty()) {
                throw new BadRequestException("EMPTY_QUESTION_GROUP",
                        "Question group #" + (gIdx + 1) + " must contain at least one question");
            }
            for (int qIdx = 0; qIdx < qInputs.size(); qIdx++) {
                QuestionInput qIn = qInputs.get(qIdx);
                QuestionType type = qIn.getQuestionType();
                List<QuestionOptionInput> opts = qIn.getOptions() != null ? qIn.getOptions() : List.of();
                if (OBJECTIVE_CHOICE_TYPES.contains(type)) {
                    if (opts.size() < 2) {
                        throw new BadRequestException("MIN_OPTIONS_REQUIRED",
                                "Question #" + (qIdx + 1) + " (" + type + ") requires at least 2 options");
                    }
                    boolean hasCorrect = opts.stream().anyMatch(o -> Boolean.TRUE.equals(o.getIsCorrect()));
                    if (!hasCorrect) {
                        throw new BadRequestException("CORRECT_OPTION_REQUIRED",
                                "Question #" + (qIdx + 1) + " (" + type + ") must mark at least one correct option");
                    }
                } else if (type == QuestionType.FILL_BLANK) {
                    if (opts.isEmpty()) {
                        throw new BadRequestException("ACCEPTED_ANSWER_REQUIRED",
                                "Question #" + (qIdx + 1) + " (FILL_BLANK) requires at least one accepted answer");
                    }
                }
            }
        }
    }

    private Users findTeacherOrUnauthorized(String username) {
        return userRepository.findByUsername(DbUserDetailsService.normalize(username))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));
    }

    private Lesson findOwnedLesson(UUID lessonId, String teacherUsername) {
        Users teacher = findTeacherOrUnauthorized(teacherUsername);
        Lesson lesson = lessonRepository.findByIdWithSectionAndCourse(lessonId)
                .orElseThrow(() -> new ResourceNotFoundException("Lesson", lessonId));
        if (!lesson.getSection().getCourse().getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenException("You do not own this lesson");
        }
        return lesson;
    }

    private Exercise findOwnedExercise(UUID exerciseId, String teacherUsername) {
        Users teacher = findTeacherOrUnauthorized(teacherUsername);
        Exercise exercise = exerciseRepository.findByIdWithFullHierarchy(exerciseId)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise", exerciseId));
        if (exercise.getLesson() == null) {
            throw new ForbiddenException("Only exercises assigned to your course lessons can be managed here");
        }
        Course course = exercise.getLesson().getSection().getCourse();
        if (!course.getTeacher().getId().equals(teacher.getId())) {
            throw new ForbiddenException("You do not own this exercise");
        }
        return exercise;
    }

    private static void ensureLessonNotFrozen(Lesson lesson) {
        if (lesson.getSection().getCourse().getStatus() == ContentStatus.PENDING_REVIEW) {
            throw new ConflictException("COURSE_PENDING_REVIEW",
                    "Cannot modify exercises while the course is pending review; withdraw it first");
        }
        if (lesson.getStatus() == ContentStatus.PENDING_REVIEW) {
            throw new ConflictException("LESSON_PENDING_REVIEW",
                    "Cannot modify exercises while the lesson is pending review; withdraw it first");
        }
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
