package com.ielts.backend.mapper;

import com.ielts.backend.dto.response.ExerciseReviewResponse;
import com.ielts.backend.dto.response.QuestionAnswerResponse;
import com.ielts.backend.dto.response.QuestionScoreResponse;
import com.ielts.backend.dto.response.SubmissionDetailResponse;
import com.ielts.backend.dto.response.SubmissionResponse;
import com.ielts.backend.dto.response.SubmissionSummaryResponse;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.QuestionAnswer;
import com.ielts.backend.entity.UserSubmission;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@Component
public class SubmissionMapper {

    public SubmissionResponse toResponse(UserSubmission submission) {
        return toResponse(submission, Collections.emptyList());
    }

    public SubmissionResponse toResponse(UserSubmission submission, List<QuestionAnswer> answers) {
        List<QuestionAnswerResponse> answerResponses = answers.stream()
                .map(this::toAnswerResponse)
                .toList();

        return SubmissionResponse.builder()
                .id(submission.getId())
                .userId(submission.getUser().getId())
                .userFullName(submission.getUser().getFullName())
                .exerciseId(submission.getExercise().getId())
                .exerciseTitle(submission.getExercise().getTitle())
                .attemptNumber(submission.getAttemptNumber())
                .answers(submission.getAnswers())
                .score(submission.getScore())
                .maxScore(submission.getMaxScore())
                .aiScore(submission.getAiScore())
                .aiFeedback(submission.getAiFeedback())
                .teacherScore(submission.getTeacherScore())
                .teacherFeedback(submission.getTeacherFeedback())
                .gradingMethod(submission.getGradingMethod())
                .gradedById(submission.getGradedBy() != null ? submission.getGradedBy().getId() : null)
                .gradedByName(submission.getGradedBy() != null ? submission.getGradedBy().getFullName() : null)
                .gradedAt(submission.getGradedAt())
                .status(submission.getStatus())
                .submittedAt(submission.getSubmittedAt())
                .questionAnswers(answerResponses)
                .createdAt(submission.getCreatedAt())
                .updatedAt(submission.getUpdatedAt())
                .build();
    }

    public QuestionAnswerResponse toAnswerResponse(QuestionAnswer answer) {
        List<java.util.UUID> selectedOptions = answer.getSelectedOptions() != null
                ? Arrays.asList(answer.getSelectedOptions())
                : Collections.emptyList();

        return QuestionAnswerResponse.builder()
                .id(answer.getId())
                .submissionId(answer.getSubmission().getId())
                .questionId(answer.getQuestion().getId())
                .answerText(answer.getAnswerText())
                .selectedOptions(selectedOptions)
                .mediaUrl(answer.getMediaUrl())
                .isCorrect(answer.getIsCorrect())
                .pointsEarned(answer.getPointsEarned())
                .aiPoints(answer.getAiPoints())
                .aiFeedback(answer.getAiFeedback())
                .teacherPoints(answer.getTeacherPoints())
                .teacherFeedback(answer.getTeacherFeedback())
                .createdAt(answer.getCreatedAt())
                .updatedAt(answer.getUpdatedAt())
                .build();
    }

    /**
     * @param questionCount graded questions of the submission
     * @param correctCount  correctly answered questions
     */
    public SubmissionSummaryResponse toSummary(UserSubmission submission, int questionCount, int correctCount) {
        return withSummary(SubmissionSummaryResponse.builder(), submission, questionCount, correctCount).build();
    }

    public SubmissionDetailResponse toDetail(UserSubmission submission, List<QuestionScoreResponse> results,
                                             ExerciseReviewResponse exercise) {
        int correctCount = (int) results.stream().filter(QuestionScoreResponse::isCorrect).count();
        return withSummary(SubmissionDetailResponse.builder(), submission, results.size(), correctCount)
                .answers(submission.getAnswers())
                .results(results)
                .exercise(exercise)
                .build();
    }

    private static <B extends SubmissionSummaryResponse.SubmissionSummaryResponseBuilder<?, ?>> B withSummary(
            B builder, UserSubmission submission, int questionCount, int correctCount) {
        Exercise exercise = submission.getExercise();
        builder.id(submission.getId())
                .exerciseId(exercise.getId())
                .exerciseTitle(exercise.getTitle())
                .skillType(exercise.getSkillType())
                .exerciseType(exercise.getExerciseType())
                .courseId(ExerciseMapper.courseId(exercise))
                .sectionId(ExerciseMapper.sectionId(exercise))
                .attemptNumber(submission.getAttemptNumber())
                .status(submission.getStatus())
                .score(submission.getScore())
                .maxScore(submission.getMaxScore())
                .correctCount(correctCount)
                .questionCount(questionCount)
                .timeSpent(submission.getTimeSpent())
                .submittedAt(submission.getSubmittedAt());
        return builder;
    }
}
