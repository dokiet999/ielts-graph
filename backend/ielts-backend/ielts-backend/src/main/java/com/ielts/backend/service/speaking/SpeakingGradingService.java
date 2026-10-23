package com.ielts.backend.service.speaking;

import com.ielts.backend.exception.BadRequestException;
import com.ielts.backend.service.grading.SpeakingGrader;
import com.ielts.backend.service.grading.SpeakingGradingResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Path;

/**
 * The one entry point the submission flow calls for Speaking: audio in, transcript and grading out.
 * It must be called outside any transaction, because both steps wait for a slow external service.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SpeakingGradingService {

    private final SpeakingAsrClient asrClient;
    private final SpeakingGrader grader;

    /** Answers with fewer words are rejected before any LLM call (an empty answer would only get an invented band). */
    @Value("${app.speaking.min-transcript-words:10}")
    private int minTranscriptWords;

    /**
     * @param audio            the audio file on disk
     * @param originalFilename name of the uploaded file, sent to the recognition service
     * @param part             QT_S_PART1, QT_S_PART2 or QT_S_PART3, from the exercise
     * @param question         the question or cue card, from the exercise
     * @throws com.ielts.backend.exception.SpeakingAsrException     ASR_TIMEOUT, ASR_UNAVAILABLE, ASR_BAD_RESPONSE
     * @throws BadRequestException                                   TRANSCRIPT_TOO_SHORT
     * @throws com.ielts.backend.exception.SpeakingGradingException  the LLM result stayed invalid after the retry
     */
    public SpeakingAssessment assess(Path audio, String originalFilename, String part, String question) {
        SpeakingAsrResult asr = asrClient.transcribe(audio, originalFilename);

        int words = countWords(asr.transcript());
        if (words < minTranscriptWords) {
            log.warn("Transcript has {} words, below the minimum of {}", words, minTranscriptWords);
            throw new BadRequestException("TRANSCRIPT_TOO_SHORT",
                    "No clear speech was detected. Please record the answer again");
        }
        SpeakingGradingResult grading = grader.grade(part, question, asr);
        return new SpeakingAssessment(asr, grading);
    }

    static int countWords(String text) {
        return text == null || text.isBlank() ? 0 : text.trim().split("\\s+").length;
    }
}
