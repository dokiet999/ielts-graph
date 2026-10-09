package com.ielts.backend.service;

import com.ielts.backend.dto.response.SubmissionResultResponse;
import com.ielts.backend.entity.*;
import com.ielts.backend.enums.QuestionType;
import com.ielts.backend.enums.Role;
import com.ielts.backend.repository.QuestionAnswerRepository;
import com.ielts.backend.repository.QuestionOptionRepository;
import com.ielts.backend.repository.QuestionRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.service.implement.ListeningGradingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ListeningGradingServiceTest {

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private QuestionOptionRepository questionOptionRepository;

    @Mock
    private UserSubmissionRepository userSubmissionRepository;

    @Mock
    private QuestionAnswerRepository questionAnswerRepository;

    @InjectMocks
    private ListeningGradingServiceImpl gradingService;

    private User user;
    private Exercise exercise;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(UUID.randomUUID())
                .username("test_student")
                .role(Role.STUDENT)
                .build();

        exercise = Exercise.builder()
                .id(UUID.randomUUID())
                .title("IELTS Listening Section 1")
                .passingScore(BigDecimal.valueOf(5.0))
                .build();
    }

    @Test
    void calculateIeltsListeningBand_standardScales() {
        assertThat(gradingService.calculateIeltsListeningBand(40, 40)).isEqualTo(9.0);
        assertThat(gradingService.calculateIeltsListeningBand(39, 40)).isEqualTo(9.0);
        assertThat(gradingService.calculateIeltsListeningBand(37, 40)).isEqualTo(8.5);
        assertThat(gradingService.calculateIeltsListeningBand(35, 40)).isEqualTo(8.0);
        assertThat(gradingService.calculateIeltsListeningBand(32, 40)).isEqualTo(7.5);
        assertThat(gradingService.calculateIeltsListeningBand(30, 40)).isEqualTo(7.0);
        assertThat(gradingService.calculateIeltsListeningBand(26, 40)).isEqualTo(6.5);
        assertThat(gradingService.calculateIeltsListeningBand(23, 40)).isEqualTo(6.0);
        assertThat(gradingService.calculateIeltsListeningBand(18, 40)).isEqualTo(5.5);
        assertThat(gradingService.calculateIeltsListeningBand(16, 40)).isEqualTo(5.0);
        assertThat(gradingService.calculateIeltsListeningBand(10, 40)).isEqualTo(4.0);
        assertThat(gradingService.calculateIeltsListeningBand(0, 40)).isEqualTo(0.0);
    }

    @Test
    void calculateIeltsListeningBand_scaledFor10Questions() {
        // 10 out of 10 -> scaled 40 -> Band 9.0
        assertThat(gradingService.calculateIeltsListeningBand(10, 10)).isEqualTo(9.0);
        // 8 out of 10 -> scaled 32 -> Band 7.5
        assertThat(gradingService.calculateIeltsListeningBand(8, 10)).isEqualTo(7.5);
        // 5 out of 10 -> scaled 20 -> Band 5.5
        assertThat(gradingService.calculateIeltsListeningBand(5, 10)).isEqualTo(5.5);
    }

    @Test
    void gradeAndSave_fillBlankAndMultipleChoice_gradesAccurately() {
        UUID q1Id = UUID.randomUUID();
        Question q1 = Question.builder()
                .id(q1Id)
                .exercise(exercise)
                .questionText("Course starts on: ______ March")
                .questionType(QuestionType.FILL_BLANK)
                .points(BigDecimal.ONE)
                .ordering(1)
                .build();

        UUID q2Id = UUID.randomUUID();
        Question q2 = Question.builder()
                .id(q2Id)
                .exercise(exercise)
                .questionText("Why does Maria want to take the course?")
                .questionType(QuestionType.MULTIPLE_CHOICE)
                .points(BigDecimal.ONE)
                .ordering(2)
                .build();

        UUID opt1Correct = UUID.randomUUID();
        QuestionOption q1Opt1 = QuestionOption.builder().id(opt1Correct).question(q1).optionText("19").isCorrect(true).build();
        QuestionOption q1Opt2 = QuestionOption.builder().id(UUID.randomUUID()).question(q1).optionText("19th").isCorrect(true).build();
        QuestionOption q1Opt3 = QuestionOption.builder().id(UUID.randomUUID()).question(q1).optionText("nineteenth").isCorrect(true).build();

        UUID opt2Correct = UUID.randomUUID();
        UUID opt2Wrong = UUID.randomUUID();
        QuestionOption q2Opt1 = QuestionOption.builder().id(opt2Wrong).question(q2).optionText("A. Work").isCorrect(false).build();
        QuestionOption q2Opt2 = QuestionOption.builder().id(opt2Correct).question(q2).optionText("B. Gift camera").isCorrect(true).build();

        when(questionRepository.findByExerciseIdOrderByOrderingAsc(exercise.getId()))
                .thenReturn(List.of(q1, q2));
        when(questionOptionRepository.findByQuestionIdInOrderByOrderingAsc(List.of(q1Id, q2Id)))
                .thenReturn(List.of(q1Opt1, q1Opt2, q1Opt3, q2Opt1, q2Opt2));
        when(userSubmissionRepository.findTopByUserIdAndExerciseIdOrderByAttemptNumberDesc(user.getId(), exercise.getId()))
                .thenReturn(Optional.empty());
        when(userSubmissionRepository.save(any(UserSubmission.class)))
                .thenAnswer(inv -> {
                    UserSubmission s = inv.getArgument(0);
                    s.setId(UUID.randomUUID());
                    return s;
                });

        // Student answers: Q1 with " 19th ", Q2 with opt2Correct UUID
        Map<String, Object> userAnswers = Map.of(
                q1Id.toString(), "  19th  ",
                q2Id.toString(), opt2Correct.toString()
        );

        SubmissionResultResponse result = gradingService.gradeAndSave(user, exercise, userAnswers);

        assertThat(result.getAttemptNumber()).isEqualTo(1);
        assertThat(result.getCorrectCount()).isEqualTo(2);
        assertThat(result.getTotalQuestions()).isEqualTo(2);
        assertThat(result.getScore()).isEqualByComparingTo(BigDecimal.valueOf(2));
        assertThat(result.getMaxScore()).isEqualByComparingTo(BigDecimal.valueOf(2));
        assertThat(result.getBandScore()).isEqualTo(9.0);

        verify(questionAnswerRepository, times(1)).saveAll(any());
        verify(userSubmissionRepository, times(1)).save(any());
    }
}
