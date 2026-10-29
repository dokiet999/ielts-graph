package com.ielts.backend.service.implement;

import com.ielts.backend.dto.response.SpeakingSubmissionResultResponse;
import com.ielts.backend.entity.Exercise;
import com.ielts.backend.entity.Question;
import com.ielts.backend.entity.QuestionAnswer;
import com.ielts.backend.entity.User;
import com.ielts.backend.entity.UserSubmission;
import com.ielts.backend.enums.ExerciseType;
import com.ielts.backend.enums.GradingMethod;
import com.ielts.backend.enums.Role;
import com.ielts.backend.enums.SkillType;
import com.ielts.backend.enums.SubmissionStatus;
import com.ielts.backend.exception.BadRequestException;
import com.ielts.backend.exception.ConflictException;
import com.ielts.backend.exception.ForbiddenException;
import com.ielts.backend.exception.LlmTimeoutException;
import com.ielts.backend.exception.LlmUnavailableException;
import com.ielts.backend.exception.ResourceNotFoundException;
import com.ielts.backend.exception.SpeakingAsrException;
import com.ielts.backend.exception.SpeakingGradingException;
import com.ielts.backend.exception.UnauthorizedException;
import com.ielts.backend.repository.ExerciseRepository;
import com.ielts.backend.repository.QuestionAnswerRepository;
import com.ielts.backend.repository.QuestionRepository;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.repository.UserSubmissionRepository;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.CourseAccessService;
import com.ielts.backend.service.SpeakingSubmissionService;
import com.ielts.backend.service.grading.SpeakingGrader;
import com.ielts.backend.service.grading.SpeakingGradingResult;
import com.ielts.backend.service.llm.LlmClient;
import com.ielts.backend.service.speaking.SpeakingAsrClient;
import com.ielts.backend.service.speaking.SpeakingAsrResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Submitting IELTS Speaking recordings and grading them with ASR + LLM (FR-8.03).
 * <p>
 * Follows the 3-step transactional pattern:
 * <ol>
 *   <li>short transaction: validate preconditions and insert the submission with status GRADING;</li>
 *   <li>outside transaction: run ASR transcription and LLM grading;</li>
 *   <li>short transaction: store the result (GRADED) or failure (FAILED), and only then throw.</li>
 * </ol>
 * A FAILED submission does not count towards the maximum number of attempts.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SpeakingSubmissionServiceImpl implements SpeakingSubmissionService {

    private static final String ATTEMPT_CONSTRAINT = "uq_submission_attempt";
    private static final BigDecimal MAX_BAND = BigDecimal.valueOf(9.0);
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("webm", "ogg", "mp3", "wav", "m4a");
    private static final Map<String, String> CONTENT_TYPE_TO_EXT = Map.of(
            "audio/webm", "webm",
            "video/webm", "webm",
            "audio/ogg", "ogg",
            "application/ogg", "ogg",
            "audio/mpeg", "mp3",
            "audio/mp3", "mp3",
            "audio/wav", "wav",
            "audio/x-wav", "wav",
            "audio/mp4", "m4a",
            "audio/x-m4a", "m4a"
    );

    private final ExerciseRepository exerciseRepository;
    private final QuestionRepository questionRepository;
    private final QuestionAnswerRepository questionAnswerRepository;
    private final UserSubmissionRepository userSubmissionRepository;
    private final UserRepository userRepository;
    private final CourseAccessService courseAccessService;
    private final SpeakingAsrClient speakingAsrClient;
    private final SpeakingGrader speakingGrader;
    private final LlmClient llmClient;
    private final TransactionTemplate transactionTemplate;

    @Value("${app.speaking.audio-dir:${java.io.tmpdir}/ielts-graph-speaking}")
    private String audioStorageDir;

    @Value("${app.speaking.max-file-size-bytes:31457280}")
    private long maxFileSizeBytes = 30L * 1024 * 1024;

    @Value("${app.speaking.min-file-size-bytes:100}")
    private long minFileSizeBytes = 100L;

    @Value("${app.speaking.min-duration-seconds:2.0}")
    private double minDurationSeconds = 2.0;

    @Value("${app.speaking.min-transcript-words:10}")
    private int minTranscriptWords = 10;

    private record PendingGrading(UUID submissionId, UUID exerciseId, String exerciseTitle, int attemptNumber,
                                  String part, String questionPrompt, UUID questionId, String audioFilename,
                                  Integer timeSpent) {
    }

    @Override
    public SpeakingSubmissionResultResponse submit(UUID exerciseId, String username, MultipartFile audio, Integer timeSpent) {
        if (timeSpent != null && (timeSpent < 0 || timeSpent > 86400)) {
            throw new BadRequestException("BAD_REQUEST", "timeSpent must be between 0 and 86400 seconds");
        }

        // Step 1: validate exercise/user/access/attempts + audio file, and record submission as GRADING
        PendingGrading pending = transactionTemplate.execute(
                status -> startGrading(exerciseId, username, audio, timeSpent));

        Path savedAudioPath = saveAudioFile(audio, pending.audioFilename());

        // Step 2: transcribe with ASR and grade with LLM outside any transaction
        long startNanos = System.nanoTime();
        SpeakingAsrResult asrResult = null;
        SpeakingGradingResult gradingResult = null;
        Exception failure = null;

        try {
            asrResult = speakingAsrClient.transcribe(savedAudioPath, audio.getOriginalFilename());
            validateAsrOutput(asrResult);
            gradingResult = speakingGrader.grade(pending.part(), pending.questionPrompt(), asrResult);
        } catch (Exception ex) {
            failure = ex;
        }
        int latencyMs = (int) TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startNanos);

        // Step 3: update submission record to GRADED or FAILED before re-throwing any exception
        if (failure != null) {
            log.error("Speaking grading failed for user {} exercise {}: {}", username, exerciseId, failure.getMessage());
            Exception cause = failure;
            SpeakingAsrResult partialAsr = asrResult;
            transactionTemplate.executeWithoutResult(
                    status -> markFailed(pending.submissionId(), pending.audioFilename(), partialAsr, cause, latencyMs));
            if (failure instanceof RuntimeException re) {
                throw re;
            }
            throw new SpeakingGradingException("GRADING_FAILED", "Speaking grading failed");
        }

        SpeakingAsrResult finalAsr = asrResult;
        SpeakingGradingResult finalGraded = gradingResult;
        return transactionTemplate.execute(status -> markGraded(pending, finalAsr, finalGraded, latencyMs));
    }

    private String validateAudioFile(MultipartFile audio, Integer timeSpent) {
        if (audio == null || audio.isEmpty()) {
            throw new BadRequestException("AUDIO_TOO_SHORT", "Audio file must not be empty");
        }
        long size = audio.getSize();
        if (size > maxFileSizeBytes) {
            throw new BadRequestException("AUDIO_TOO_LARGE",
                    "Audio file exceeds maximum size of " + (maxFileSizeBytes / (1024 * 1024)) + " MB");
        }

        String ext = extractExtension(audio.getOriginalFilename(), audio.getContentType());
        if (ext == null || !ALLOWED_EXTENSIONS.contains(ext)) {
            throw new BadRequestException("UNSUPPORTED_AUDIO",
                    "Unsupported audio format. Allowed formats: webm, ogg, mp3, wav, m4a");
        }

        if (size < minFileSizeBytes) {
            throw new BadRequestException("AUDIO_TOO_SHORT", "Audio recording is too short");
        }
        if (timeSpent != null && timeSpent > 0 && timeSpent < minDurationSeconds) {
            throw new BadRequestException("AUDIO_TOO_SHORT",
                    "Audio recording must be at least " + (int) Math.ceil(minDurationSeconds) + " seconds long");
        }
        if ("wav".equals(ext)) {
            Double wavDuration = estimateWavDurationSeconds(audio, size);
            if (wavDuration != null && wavDuration < minDurationSeconds) {
                throw new BadRequestException("AUDIO_TOO_SHORT",
                        "Audio recording must be at least " + (int) Math.ceil(minDurationSeconds) + " seconds long");
            }
        }
        return ext;
    }

    private static String extractExtension(String originalFilename, String contentType) {
        if (originalFilename != null && !originalFilename.isBlank()) {
            String cleanName = originalFilename.replace('\\', '/');
            int slashIdx = cleanName.lastIndexOf('/');
            if (slashIdx >= 0) {
                cleanName = cleanName.substring(slashIdx + 1);
            }
            int dotIdx = cleanName.lastIndexOf('.');
            if (dotIdx >= 0 && dotIdx < cleanName.length() - 1) {
                return cleanName.substring(dotIdx + 1).toLowerCase(Locale.ROOT).trim();
            }
        }
        if (contentType != null && !contentType.isBlank()) {
            String baseType = contentType.split(";")[0].trim().toLowerCase(Locale.ROOT);
            return CONTENT_TYPE_TO_EXT.get(baseType);
        }
        return null;
    }

    /**
     * Reads the standard 44-byte RIFF/WAVE header if present to compute exact duration from byteRate.
     */
    private static Double estimateWavDurationSeconds(MultipartFile audio, long totalBytes) {
        if (totalBytes < 44) {
            return 0.0;
        }
        try (InputStream is = audio.getInputStream()) {
            byte[] header = is.readNBytes(44);
            if (header.length < 44) {
                return null;
            }
            String riff = new String(header, 0, 4, StandardCharsets.US_ASCII);
            String wave = new String(header, 8, 4, StandardCharsets.US_ASCII);
            if (!"RIFF".equals(riff) || !"WAVE".equals(wave)) {
                return null;
            }
            int byteRate = ByteBuffer.wrap(header, 28, 4).order(ByteOrder.LITTLE_ENDIAN).getInt();
            if (byteRate <= 0) {
                return null;
            }
            return Math.max(0.0, (double) (totalBytes - 44) / byteRate);
        } catch (IOException e) {
            return null;
        }
    }

    private Path saveAudioFile(MultipartFile audio, String generatedFilename) {
        try {
            Path baseDir = Paths.get(audioStorageDir).toAbsolutePath().normalize();
            Files.createDirectories(baseDir);
            Path target = baseDir.resolve(generatedFilename).normalize();
            if (!target.startsWith(baseDir)) {
                throw new BadRequestException("INVALID_AUDIO_FILENAME", "Invalid audio target path");
            }
            try (InputStream is = audio.getInputStream()) {
                Files.copy(is, target, StandardCopyOption.REPLACE_EXISTING);
            }
            return target;
        } catch (BadRequestException ex) {
            throw ex;
        } catch (IOException ex) {
            log.error("Failed to save uploaded audio file {}", generatedFilename, ex);
            throw new IllegalStateException("Could not store uploaded audio file", ex);
        }
    }

    private void validateAsrOutput(SpeakingAsrResult asr) {
        if (asr == null) {
            throw new SpeakingAsrException("ASR_BAD_RESPONSE", "ASR service returned empty result");
        }
        if (asr.features() != null
                && asr.features().durationSec() > 0
                && asr.features().durationSec() < minDurationSeconds) {
            throw new BadRequestException("AUDIO_TOO_SHORT",
                    "Audio recording must be at least " + (int) Math.ceil(minDurationSeconds) + " seconds long");
        }
        if (asr.transcript() == null || asr.transcript().isBlank()) {
            throw new BadRequestException("AUDIO_TOO_SHORT", "No speech was detected in the audio recording");
        }
        int words = asr.transcript().trim().split("\\s+").length;
        if (words < minTranscriptWords) {
            throw new BadRequestException("AUDIO_TOO_SHORT",
                    "Too little speech was detected. Please speak for longer (at least " + minTranscriptWords + " words)");
        }
    }

    private PendingGrading startGrading(UUID exerciseId, String username, MultipartFile audio, Integer timeSpent) {
        Exercise exercise = exerciseRepository.findById(exerciseId)
                .filter(e -> e.getExerciseType() != ExerciseType.MOCK_TEST)
                .orElseThrow(() -> new ResourceNotFoundException("Exercise", exerciseId));

        if (exercise.getSkillType() != SkillType.SPEAKING) {
            throw new BadRequestException("INVALID_EXERCISE", "This exercise is not a Speaking exercise");
        }

        User user = userRepository.findByUsername(DbUserDetailsService.normalize(username))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));

        if (user.getRole() != Role.STUDENT) {
            throw new ForbiddenException("Only students can submit exercises");
        }

        courseAccessService.checkExerciseAccess(exercise, username);

        List<UserSubmission> previous = userSubmissionRepository
                .findByUserIdAndExerciseIdOrderByAttemptNumberDesc(user.getId(), exerciseId);
        long usedAttempts = previous.stream().filter(s -> s.getStatus() != SubmissionStatus.FAILED).count();
        if (exercise.getMaxAttempts() != null && exercise.getMaxAttempts() > 0
                && usedAttempts >= exercise.getMaxAttempts()) {
            throw new ConflictException("MAX_ATTEMPTS_REACHED",
                    "Maximum attempts (" + exercise.getMaxAttempts() + ") reached for this exercise");
        }

        String extension = validateAudioFile(audio, timeSpent);
        String audioFilename = UUID.randomUUID() + "." + extension;
        int attemptNumber = previous.isEmpty() ? 1 : previous.get(0).getAttemptNumber() + 1;

        List<Question> questions = questionRepository.findByExerciseIdOrderByOrderingAsc(exerciseId);
        Question question = questions.isEmpty() ? null : questions.get(0);
        String questionPrompt = resolvePrompt(exercise, question);

        UserSubmission submission = saveSubmission(UserSubmission.builder()
                .user(user)
                .exercise(exercise)
                .attemptNumber(attemptNumber)
                .answers(Map.of("audioFilename", audioFilename))
                .score(BigDecimal.ZERO)
                .maxScore(MAX_BAND)
                .aiModel(llmClient.getModelName())
                .aiPromptVersion(SpeakingGrader.PROMPT_VERSION)
                .status(SubmissionStatus.GRADING)
                .gradingMethod(GradingMethod.AI)
                .timeSpent(timeSpent)
                .submittedAt(LocalDateTime.now())
                .build());

        return new PendingGrading(submission.getId(), exercise.getId(), exercise.getTitle(), attemptNumber,
                partOf(exercise), questionPrompt, question != null ? question.getId() : null, audioFilename, timeSpent);
    }

    private void markFailed(UUID submissionId, String audioFilename, SpeakingAsrResult asr, Exception failure, int latencyMs) {
        UserSubmission submission = userSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission", submissionId));
        if (asr != null) {
            submission.setAnswers(buildAnswersMap(audioFilename, asr));
        }
        submission.setStatus(SubmissionStatus.FAILED);
        submission.setAiFeedback(failureCode(failure));
        submission.setAiLatencyMs(latencyMs);
        userSubmissionRepository.saveAndFlush(submission);
    }

    private SpeakingSubmissionResultResponse markGraded(
            PendingGrading pending, SpeakingAsrResult asr, SpeakingGradingResult result, int latencyMs) {
        UserSubmission submission = userSubmissionRepository.findById(pending.submissionId())
                .orElseThrow(() -> new ResourceNotFoundException("Submission", pending.submissionId()));

        Map<String, Object> answersMap = buildAnswersMap(pending.audioFilename(), asr);
        Integer effectiveTimeSpent = pending.timeSpent() != null
                ? pending.timeSpent()
                : (asr.features() != null ? (int) Math.round(asr.features().durationSec()) : null);

        submission.setAnswers(answersMap);
        submission.setScore(result.getOverallBand());
        submission.setAiScore(result.getOverallBand());
        submission.setAiFeedback(result.getSummary());
        submission.setAiStructuredFeedback(result.getFeedbackMap());
        submission.setAiLatencyMs(latencyMs);
        submission.setTimeSpent(effectiveTimeSpent);
        submission.setStatus(SubmissionStatus.GRADED);
        submission.setGradedAt(LocalDateTime.now());
        userSubmissionRepository.saveAndFlush(submission);

        if (pending.questionId() != null) {
            questionRepository.findById(pending.questionId()).ifPresent(question ->
                    questionAnswerRepository.saveAndFlush(QuestionAnswer.builder()
                            .submission(submission)
                            .question(question)
                            .answerText(asr.transcript())
                            .mediaUrl(pending.audioFilename())
                            .aiPoints(result.getOverallBand())
                            .aiFeedback(result.getSummary())
                            .pointsEarned(result.getOverallBand())
                            .build()));
        }

        return SpeakingSubmissionResultResponse.builder()
                .submissionId(submission.getId())
                .exerciseId(pending.exerciseId())
                .exerciseTitle(pending.exerciseTitle())
                .attemptNumber(pending.attemptNumber())
                .overallBand(result.getOverallBand())
                .outOfCalibrationRange(result.isOutOfCalibrationRange())
                .status(SubmissionStatus.GRADED)
                .gradingMethod(GradingMethod.AI)
                .timeSpent(effectiveTimeSpent)
                .submittedAt(submission.getSubmittedAt())
                .part(result.getPart())
                .transcript(asr.transcript())
                .asrModel(asr.asrModel())
                .features(asr.toFeaturesMap())
                .pronunciation(asr.toPronunciationMap())
                .summary(result.getSummary())
                .improvements(result.getImprovements())
                .aiModel(submission.getAiModel())
                .aiPromptVersion(submission.getAiPromptVersion())
                .aiLatencyMs(submission.getAiLatencyMs())
                .rawFeedback(result.getFeedbackMap())
                .build();
    }

    private static Map<String, Object> buildAnswersMap(String audioFilename, SpeakingAsrResult asr) {
        Map<String, Object> answers = new LinkedHashMap<>();
        answers.put("audioFilename", audioFilename);
        if (asr != null) {
            answers.put("transcript", asr.transcript());
            answers.put("asrModel", asr.asrModel());
            answers.put("language", asr.language());
            answers.put("features", asr.toFeaturesMap());
            answers.put("pronunciation", asr.toPronunciationMap());
        }
        return answers;
    }

    private static String partOf(Exercise exercise) {
        Map<String, Object> content = exercise.getContent();
        return content != null && content.get("part") instanceof String part ? part : "QT_S_PART2";
    }

    private static String resolvePrompt(Exercise exercise, Question question) {
        Map<String, Object> content = exercise.getContent();
        if (content != null && content.get("prompt") instanceof String prompt && !prompt.isBlank()) {
            return prompt;
        }
        if (question != null && question.getQuestionText() != null && !question.getQuestionText().isBlank()) {
            return question.getQuestionText();
        }
        return exercise.getInstruction() != null && !exercise.getInstruction().isBlank()
                ? exercise.getInstruction()
                : exercise.getTitle();
    }

    private static String failureCode(Exception ex) {
        if (ex instanceof BadRequestException bre) {
            return bre.getCode();
        }
        if (ex instanceof SpeakingGradingException sge) {
            return sge.getCode();
        }
        if (ex instanceof SpeakingAsrException sae) {
            return sae.getCode();
        }
        if (ex instanceof LlmTimeoutException) {
            return "LLM_TIMEOUT";
        }
        if (ex instanceof LlmUnavailableException) {
            return "LLM_UNAVAILABLE";
        }
        return "GRADING_FAILED";
    }

    private UserSubmission saveSubmission(UserSubmission submission) {
        try {
            return userSubmissionRepository.saveAndFlush(submission);
        } catch (DataIntegrityViolationException ex) {
            if (!isAttemptConflict(ex)) {
                throw ex;
            }
            throw new ConflictException("SUBMISSION_CONFLICT",
                    "Another submission for this exercise is being saved, please retry");
        }
    }

    private static boolean isAttemptConflict(DataIntegrityViolationException ex) {
        for (Throwable t = ex; t != null; t = t.getCause()) {
            if (t.getMessage() != null && t.getMessage().contains(ATTEMPT_CONSTRAINT)) {
                return true;
            }
        }
        return false;
    }
}
