package com.ielts.backend.service;

import com.ielts.backend.dto.request.CreateTeacherRequest;
import com.ielts.backend.dto.request.UpdateTeacherRequest;
import com.ielts.backend.dto.response.TeacherAccountResponse;
import com.ielts.backend.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface AdminTeacherService {

    TeacherAccountResponse createTeacher(CreateTeacherRequest request);

    Page<TeacherAccountResponse> listTeachers(UserStatus status, String q, Pageable pageable);

    TeacherAccountResponse getTeacher(UUID id);

    TeacherAccountResponse updateTeacher(UUID id, UpdateTeacherRequest request);

    TeacherAccountResponse resetTeacherPassword(UUID id);

    TeacherAccountResponse approveTeacher(UUID id);

    TeacherAccountResponse lockTeacher(UUID id, String reason);

    TeacherAccountResponse unlockTeacher(UUID id);
}

