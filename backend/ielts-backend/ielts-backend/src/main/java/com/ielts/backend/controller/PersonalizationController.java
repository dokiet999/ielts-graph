package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.dto.request.TargetBandRequest;
import com.ielts.backend.dto.response.PersonalizationResponse;
import com.ielts.backend.service.PersonalizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/personalization")
@RequiredArgsConstructor
@Tag(name = "Personalization", description = "Weaknesses of the current learner from the learner profile and the Knowledge Graph")
public class PersonalizationController {

    private final PersonalizationService personalizationService;

    @GetMapping
    @Operation(summary = "Bands against the target, SubSkill mastery and ranked recurring errors of the current learner")
    public BaseResponse<PersonalizationResponse> getPersonalization(@AuthenticationPrincipal UserDetails principal) {
        return BaseResponse.ofSuccess(personalizationService.getPersonalization(principal.getUsername()));
    }

    @PutMapping("/target-band")
    @Operation(summary = "Set the target band of WRITING or SPEAKING and return the updated personalization")
    public BaseResponse<PersonalizationResponse> setTargetBand(@AuthenticationPrincipal UserDetails principal,
                                                                @Valid @RequestBody TargetBandRequest request) {
        return BaseResponse.ofSuccess(personalizationService.setTargetBand(principal.getUsername(), request));
    }
}
