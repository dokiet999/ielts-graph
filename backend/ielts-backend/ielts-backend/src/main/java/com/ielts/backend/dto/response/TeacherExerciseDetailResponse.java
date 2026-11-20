package com.ielts.backend.dto.response;

import com.ielts.backend.enums.ContentStatus;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.QuestionType;
import com.ielts.backend.enums.SkillType;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class TeacherExerciseDetailResponse {
    private UUID id;
    private UUID lessonId;
    private String lessonTitle;
    private ContentStatus lessonStatus;
    private UUID sectionId;
    private String sectionTitle;
    private UUID courseId;
    private String courseTitle;
    private ContentStatus courseStatus;
    private String title;
    private String instruction;
    private String audioUrl;
    private Map<String, Object> content;
    private ExerciseType exerciseType;
    private SkillType skillType;
    private Integer timeLimit;
    private Integer maxAttempts;
    private BigDecimal passingScore;
    private Integer ordering;
    private long submissionCount;
    private int totalQuestions;
    private List<TeacherQuestionGroupResponse> questionGroups;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    public static class TeacherQuestionGroupResponse {
        private UUID id;
        private String groupTitle;
        private String groupInstruction;
        private String passageReference;
        private String imageUrl;
        private QuestionType questionType;
        private String questionRange;
        private Integer ordering;
        private List<TeacherQuestionResponse> questions;
    }

    @Data
    @Builder
    public static class TeacherQuestionResponse {
        private UUID id;
        private String questionText;
        private QuestionType questionType;
        private String imageUrl;
        private String audioUrl;
        private String readingPassage;
        private String explanation;
        private BigDecimal points;
        private Integer ordering;
        private List<TeacherQuestionOptionResponse> options;
    }

    @Data
    @Builder
    public static class TeacherQuestionOptionResponse {
        private UUID id;
        private String optionText;
        private Boolean isCorrect;
        private BigDecimal point;
        private String explanation;
        private Integer ordering;
    }
}
