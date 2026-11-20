package com.ielts.backend.service;

import com.ielts.backend.dto.request.ReplaceExerciseQuestionsRequest;
import com.ielts.backend.dto.request.TeacherExerciseRequest;
import com.ielts.backend.dto.response.TeacherExerciseDetailResponse;
import com.ielts.backend.dto.response.TeacherLessonExercisesResponse;

import java.util.UUID;

public interface TeacherExerciseService {

    TeacherLessonExercisesResponse getLessonExercises(UUID lessonId, String teacherUsername);

    TeacherExerciseDetailResponse getExerciseDetail(UUID exerciseId, String teacherUsername);

    TeacherExerciseDetailResponse createExercise(UUID lessonId, String teacherUsername, TeacherExerciseRequest request);

    TeacherExerciseDetailResponse updateExercise(UUID exerciseId, String teacherUsername, TeacherExerciseRequest request);

    void deleteExercise(UUID exerciseId, String teacherUsername);

    TeacherExerciseDetailResponse replaceQuestions(
            UUID exerciseId, String teacherUsername, ReplaceExerciseQuestionsRequest request);
}
