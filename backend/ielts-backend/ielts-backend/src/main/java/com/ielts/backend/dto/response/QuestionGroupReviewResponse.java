package com.ielts.backend.dto.response;

import com.ielts.backend.enums.QuestionType;
import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Builder
public class QuestionGroupReviewResponse {
    private UUID id;
    private String groupTitle;
    private String groupInstruction;
    private String passageReference;
    private String imageUrl;
    private QuestionType questionType;
    private String questionRange;
    private Integer ordering;
    private List<QuestionReviewResponse> questions;
}
