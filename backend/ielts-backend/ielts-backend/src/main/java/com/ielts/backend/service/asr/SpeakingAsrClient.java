package com.ielts.backend.service.asr;

import java.nio.file.Path;

/**
 * Client for the Python AI Speech-to-Text (Whisper + speech features + optional pronunciation) service.
 */
public interface SpeakingAsrClient {

    /**
     * Transcribes one spoken answer audio file and extracts speech features and optional pronunciation metrics.
     *
     * @param audio            path to the saved local audio file
     * @param originalFilename original client filename (for MIME/extension hints)
     * @return structured ASR result matching speaking_asr.schema.json
     */
    SpeakingAsrResult transcribe(Path audio, String originalFilename);
}
