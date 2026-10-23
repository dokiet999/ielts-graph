package com.ielts.backend.service.speaking;

import com.ielts.backend.exception.BadRequestException;
import com.ielts.backend.exception.SpeakingAsrException;
import com.ielts.backend.service.grading.SpeakingGrader;
import com.ielts.backend.service.grading.SpeakingGradingResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpeakingGradingServiceTest {

    private static final Path AUDIO = Path.of("answer.webm");
    private static final String PART = "QT_S_PART1";
    private static final String QUESTION = "Where do you live?";

    @Mock
    private SpeakingAsrClient asrClient;
    @Mock
    private SpeakingGrader grader;
    @Mock
    private SpeakingGradingResult grading;

    private SpeakingGradingService service;

    @BeforeEach
    void setUp() {
        service = new SpeakingGradingService(asrClient, grader);
        ReflectionTestUtils.setField(service, "minTranscriptWords", 10);
    }

    private static SpeakingAsrResult asrWith(String transcript) {
        return new SpeakingAsrResult("1.0", "whisper-small", "en", transcript,
                new SpeakingAsrResult.Features(12.0, 0, 0, 0, 0, 0), null);
    }

    @Test
    void assess_enoughWords_returnsAsrAndGrading() {
        SpeakingAsrResult asr = asrWith("I live in a small flat near the centre of Hanoi with my family");
        when(asrClient.transcribe(AUDIO, "answer.webm")).thenReturn(asr);
        when(grader.grade(PART, QUESTION, asr)).thenReturn(grading);

        SpeakingAssessment result = service.assess(AUDIO, "answer.webm", PART, QUESTION);

        assertThat(result.asr()).isSameAs(asr);
        assertThat(result.grading()).isSameAs(grading);
    }

    @Test
    void assess_transcriptTooShort_isRejectedBeforeTheLlmIsCalled() {
        when(asrClient.transcribe(AUDIO, "answer.webm")).thenReturn(asrWith("Um, yes."));

        assertThatThrownBy(() -> service.assess(AUDIO, "answer.webm", PART, QUESTION))
                .isInstanceOf(BadRequestException.class)
                .extracting("code").isEqualTo("TRANSCRIPT_TOO_SHORT");
        verify(grader, never()).grade(any(), any(), any());
    }

    @Test
    void assess_emptyOrNullTranscript_isRejected() {
        when(asrClient.transcribe(AUDIO, "answer.webm")).thenReturn(asrWith("   "), asrWith(null));

        assertThatThrownBy(() -> service.assess(AUDIO, "answer.webm", PART, QUESTION))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.assess(AUDIO, "answer.webm", PART, QUESTION))
                .isInstanceOf(BadRequestException.class);
        verify(grader, never()).grade(any(), any(), any());
    }

    @Test
    void assess_asrFailure_isPassedOnAndNothingIsGraded() {
        when(asrClient.transcribe(AUDIO, "answer.webm"))
                .thenThrow(new SpeakingAsrException("ASR_TIMEOUT", "timed out"));

        assertThatThrownBy(() -> service.assess(AUDIO, "answer.webm", PART, QUESTION))
                .isInstanceOf(SpeakingAsrException.class)
                .extracting("code").isEqualTo("ASR_TIMEOUT");
        verify(grader, never()).grade(any(), any(), any());
    }

    @Test
    void countWords_handlesBlankNullAndExtraSpaces() {
        assertThat(SpeakingGradingService.countWords(null)).isZero();
        assertThat(SpeakingGradingService.countWords("  ")).isZero();
        assertThat(SpeakingGradingService.countWords("  one   two\nthree ")).isEqualTo(3);
    }
}
