package com.ielts.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KgRecommendationResponse {

    private String skill;
    private Integer bandRequested;
    private Integer bandApplied;
    private List<RecommendationItem> recommendations;
    private List<String> unmatchedErrors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendationItem {
        private String resourceId;
        private String nameVi;
        private String nameEn;
        private String type;
        private String sqlRef;
        private String bandMatch;
        private RecommendationPath path;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendationPath {
        private NodeRef errorType;
        private NodeRef subSkill;
        private NodeRef criterion;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NodeRef {
        private String id;
        private String nameVi;
        private String nameEn;
    }
}

