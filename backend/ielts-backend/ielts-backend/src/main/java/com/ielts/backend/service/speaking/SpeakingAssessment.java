package com.ielts.backend.service.speaking;

import com.ielts.backend.service.grading.SpeakingGradingResult;

/** Everything produced for one Speaking answer: what was recognised and how it was graded. */
public record SpeakingAssessment(SpeakingAsrResult asr, SpeakingGradingResult grading) {
}
