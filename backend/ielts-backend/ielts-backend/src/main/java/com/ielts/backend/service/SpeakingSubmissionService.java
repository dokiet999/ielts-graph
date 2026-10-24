package com.ielts.backend.service;

import com.ielts.backend.dto.response.SpeakingSubmissionResultResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface SpeakingSubmissionService {

    SpeakingSubmissionResultResponse submit(UUID exerciseId, String username, MultipartFile audio, Integer timeSpent);
}
