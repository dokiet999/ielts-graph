package com.ielts.backend.service;

import com.ielts.backend.dto.response.StudentAccountResponse;
import com.ielts.backend.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface AdminStudentService {

    Page<StudentAccountResponse> listStudents(UserStatus status, String q, Pageable pageable);

    StudentAccountResponse lockStudent(UUID id, String reason);

    StudentAccountResponse unlockStudent(UUID id);
}
