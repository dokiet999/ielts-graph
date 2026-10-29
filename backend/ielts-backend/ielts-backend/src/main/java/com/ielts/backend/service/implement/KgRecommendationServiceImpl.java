package com.ielts.backend.service.implement;

import com.ielts.backend.dto.response.KgRecommendationResponse;
import com.ielts.backend.dto.response.KgRecommendationResponse.NodeRef;
import com.ielts.backend.dto.response.KgRecommendationResponse.RecommendationItem;
import com.ielts.backend.dto.response.KgRecommendationResponse.RecommendationPath;
import com.ielts.backend.exception.BadRequestException;
import com.ielts.backend.service.KgRecommendationService;
import com.ielts.backend.service.kg.KgGraphClient;
import com.ielts.backend.service.kg.KgGraphClient.CandidateResourceRow;
import com.ielts.backend.service.kg.KgGraphClient.ErrorClassification;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class KgRecommendationServiceImpl implements KgRecommendationService {

    private static final Set<String> ALLOWED_SKILLS = Set.of("SKILL_W", "SKILL_S");
    private static final int MAX_ERRORS = 10;
    private static final int MIN_BAND = 4;
    private static final int MAX_BAND = 8;
    private static final int DEFAULT_LIMIT_PER_ERROR = 3;
    private static final int MIN_LIMIT_PER_ERROR = 1;
    private static final int MAX_LIMIT_PER_ERROR = 5;

    private static final Comparator<CandidateResourceRow> PATH_CHOICE_COMPARATOR = Comparator
            .comparing(CandidateResourceRow::practicesSubSkill, Comparator.reverseOrder())
            .thenComparing(CandidateResourceRow::subSkillId)
            .thenComparing(CandidateResourceRow::criterionId);

    private static final Comparator<ScoredCandidate> CANDIDATE_ORDER_COMPARATOR = Comparator
            .comparing(ScoredCandidate::fixes, Comparator.reverseOrder())
            .thenComparingInt(ScoredCandidate::bandRank)
            .thenComparingInt(ScoredCandidate::nearestDistance)
            .thenComparingInt(ScoredCandidate::nearestBand)
            .thenComparing(c -> c.row().resourceId());

    private final KgGraphClient kgGraphClient;

    private record ScoredCandidate(
            CandidateResourceRow row,
            boolean fixes,
            String bandMatch,
            int bandRank,
            int nearestDistance,
            int nearestBand
    ) {}

    @Override
    public KgRecommendationResponse getRecommendations(
            String skill,
            String errorsParam,
            String bandParam,
            String limitPerErrorParam
    ) {
        // 1. Validate parameters
        if (skill == null || !ALLOWED_SKILLS.contains(skill)) {
            throw new BadRequestException("KG_INVALID_PARAM", "Parameter 'skill' must be SKILL_W or SKILL_S");
        }

        List<String> requestedErrors = parseAndValidateErrors(errorsParam);

        Integer bandRequested = null;
        Integer bandApplied = null;
        if (bandParam != null) {
            int parsedBand = parseIntegerParam(bandParam, "band");
            bandRequested = parsedBand;
            bandApplied = Math.max(MIN_BAND, Math.min(MAX_BAND, parsedBand));
        }

        int limitPerError = DEFAULT_LIMIT_PER_ERROR;
        if (limitPerErrorParam != null) {
            limitPerError = parseIntegerParam(limitPerErrorParam, "limitPerError");
            if (limitPerError < MIN_LIMIT_PER_ERROR || limitPerError > MAX_LIMIT_PER_ERROR) {
                throw new BadRequestException("KG_INVALID_PARAM",
                        "Parameter 'limitPerError' must be between 1 and 5");
            }
        }

        // 2. Query A: classify errors and detect unknown error codes
        List<ErrorClassification> classifications = kgGraphClient.classifyErrors(skill, requestedErrors);
        Map<String, ErrorClassification> classificationById = new HashMap<>();
        for (ErrorClassification c : classifications) {
            classificationById.put(c.id(), c);
        }

        List<String> unknownIds = requestedErrors.stream()
                .filter(id -> !classificationById.containsKey(id))
                .toList();
        if (!unknownIds.isEmpty()) {
            throw new BadRequestException("KG_UNKNOWN_ERROR_CODE",
                    "Unknown error code(s) in parameter 'errors'", unknownIds);
        }

        // 3. Filter errors valid for the requested skill
        List<String> validErrorIds = requestedErrors.stream()
                .filter(id -> classificationById.get(id).validForSkill())
                .toList();

        // 4. Query B: candidate Resources for valid errors
        Map<String, List<CandidateResourceRow>> rowsByError = new HashMap<>();
        if (!validErrorIds.isEmpty()) {
            List<CandidateResourceRow> rows = kgGraphClient.findCandidateResources(skill, validErrorIds);
            for (CandidateResourceRow row : rows) {
                rowsByError.computeIfAbsent(row.errorId(), k -> new ArrayList<>()).add(row);
            }
        }

        // 5 & 6. Group per error, deduplicate per (errorId, resourceId), sort, limit, and assemble in request order
        List<RecommendationItem> recommendations = new ArrayList<>();
        List<String> unmatchedErrors = new ArrayList<>();

        for (String errorId : requestedErrors) {
            ErrorClassification classification = classificationById.get(errorId);
            if (!classification.validForSkill()) {
                unmatchedErrors.add(errorId);
                continue;
            }

            List<CandidateResourceRow> errorRows = rowsByError.getOrDefault(errorId, List.of());
            if (errorRows.isEmpty()) {
                unmatchedErrors.add(errorId);
                continue;
            }

            List<RecommendationItem> itemsForError = selectAndOrderForError(errorRows, bandApplied, limitPerError);
            if (itemsForError.isEmpty()) {
                unmatchedErrors.add(errorId);
            } else {
                recommendations.addAll(itemsForError);
            }
        }

        return KgRecommendationResponse.builder()
                .skill(skill)
                .bandRequested(bandRequested)
                .bandApplied(bandApplied)
                .recommendations(recommendations)
                .unmatchedErrors(unmatchedErrors)
                .build();
    }

    private List<String> parseAndValidateErrors(String errorsParam) {
        if (errorsParam == null || errorsParam.isBlank()) {
            throw new BadRequestException("KG_INVALID_PARAM", "Parameter 'errors' is required");
        }
        String[] parts = errorsParam.split(",", -1);
        if (parts.length < 1 || parts.length > MAX_ERRORS) {
            throw new BadRequestException("KG_INVALID_PARAM",
                    "Parameter 'errors' must contain between 1 and 10 error codes");
        }

        List<String> result = new ArrayList<>(parts.length);
        Set<String> seen = new HashSet<>();
        for (String raw : parts) {
            String token = raw.trim();
            if (token.isEmpty()) {
                throw new BadRequestException("KG_INVALID_PARAM",
                        "Parameter 'errors' must not contain empty error codes");
            }
            if (!seen.add(token)) {
                throw new BadRequestException("KG_INVALID_PARAM",
                        "Parameter 'errors' must not contain duplicate error codes");
            }
            result.add(token);
        }
        return result;
    }

    private int parseIntegerParam(String raw, String paramName) {
        if (raw.isBlank()) {
            throw new BadRequestException("KG_INVALID_PARAM",
                    "Parameter '" + paramName + "' must be an integer");
        }
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            throw new BadRequestException("KG_INVALID_PARAM",
                    "Parameter '" + paramName + "' must be an integer");
        }
    }

    private List<RecommendationItem> selectAndOrderForError(
            List<CandidateResourceRow> errorRows,
            Integer bandApplied,
            int limitPerError
    ) {
        // Deduplicate per resourceId: prefer practicesSubSkill=true, then smallest subSkillId, then smallest criterionId
        Map<String, CandidateResourceRow> bestRowByResource = new LinkedHashMap<>();
        for (CandidateResourceRow row : errorRows) {
            bestRowByResource.merge(row.resourceId(), row, (existing, incoming) ->
                    PATH_CHOICE_COMPARATOR.compare(incoming, existing) < 0 ? incoming : existing
            );
        }

        List<ScoredCandidate> scored = new ArrayList<>(bestRowByResource.size());
        for (CandidateResourceRow row : bestRowByResource.values()) {
            scored.add(scoreCandidate(row, bandApplied));
        }

        scored.sort(CANDIDATE_ORDER_COMPARATOR);

        int count = Math.min(limitPerError, scored.size());
        List<RecommendationItem> result = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            ScoredCandidate sc = scored.get(i);
            CandidateResourceRow r = sc.row();
            result.add(RecommendationItem.builder()
                    .resourceId(r.resourceId())
                    .nameVi(r.resourceNameVi())
                    .nameEn(r.resourceNameEn())
                    .type(r.resourceType())
                    .sqlRef(r.sqlRef())
                    .bandMatch(sc.bandMatch())
                    .path(RecommendationPath.builder()
                            .errorType(NodeRef.builder()
                                    .id(r.errorId())
                                    .nameVi(r.errorNameVi())
                                    .nameEn(r.errorNameEn())
                                    .build())
                            .subSkill(NodeRef.builder()
                                    .id(r.subSkillId())
                                    .nameVi(r.subSkillNameVi())
                                    .nameEn(r.subSkillNameEn())
                                    .build())
                            .criterion(NodeRef.builder()
                                    .id(r.criterionId())
                                    .nameVi(r.criterionNameVi())
                                    .nameEn(r.criterionNameEn())
                                    .build())
                            .build())
                    .build());
        }
        return result;
    }

    private ScoredCandidate scoreCandidate(CandidateResourceRow row, Integer bandApplied) {
        List<Integer> bands = row.bands() != null ? row.bands() : List.of();
        if (bandApplied == null || bands.isEmpty()) {
            return new ScoredCandidate(row, row.fixes(), "any", 0, 0, 0);
        }
        if (bands.contains(bandApplied)) {
            return new ScoredCandidate(row, row.fixes(), "exact", 0, 0, bandApplied);
        }

        int bestDistance = Integer.MAX_VALUE;
        int bestBand = Integer.MAX_VALUE;
        for (Integer b : bands) {
            if (b == null) {
                continue;
            }
            int dist = Math.abs(b - bandApplied);
            if (dist < bestDistance || (dist == bestDistance && b < bestBand)) {
                bestDistance = dist;
                bestBand = b;
            }
        }
        return new ScoredCandidate(row, row.fixes(), "nearest", 1, bestDistance, bestBand);
    }
}

