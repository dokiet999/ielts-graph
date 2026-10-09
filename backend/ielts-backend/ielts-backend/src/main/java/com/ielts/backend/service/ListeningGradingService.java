package com.ielts.backend.service;

import com.ielts.backend.dto.response.SubmissionResultResponse;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.User;

import java.util.Map;

public interface ListeningGradingService {

    SubmissionResultResponse gradeAndSave(User user, Exercise exercise, Map<String, Object> rawAnswers);

    double calculateIeltsListeningBand(int correctCount, int totalQuestions);
}
