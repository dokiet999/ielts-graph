package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.constant.PaginationConstants;
import com.ielts.backend.dto.request.LockUserRequest;
import com.ielts.backend.dto.response.StudentAccountResponse;
import com.ielts.backend.enums.UserStatus;
import com.ielts.backend.service.AdminStudentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/students")
@RequiredArgsConstructor
@Tag(name = "Admin - Students", description = "List, lock and unlock student accounts")
public class AdminStudentController {

    private final AdminStudentService adminStudentService;

    @GetMapping
    @Operation(summary = "List student accounts filtered by status and search keyword")
    public BaseResponse<List<StudentAccountResponse>> listStudents(
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_PAGE_STR) int page,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_SIZE_STR) int size) {
        PageRequest pageable = PaginationConstants.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id")));
        return BaseResponse.ofSuccess(adminStudentService.listStudents(status, q, pageable));
    }

    @PostMapping("/{id}/lock")
    @Operation(summary = "Lock a student account with a required reason")
    public BaseResponse<StudentAccountResponse> lockStudent(
            @PathVariable UUID id,
            @Valid @RequestBody LockUserRequest request) {
        return BaseResponse.ofSuccess(adminStudentService.lockStudent(id, request.getReason()));
    }

    @PostMapping("/{id}/unlock")
    @Operation(summary = "Unlock a LOCKED student account")
    public BaseResponse<StudentAccountResponse> unlockStudent(@PathVariable UUID id) {
        return BaseResponse.ofSuccess(adminStudentService.unlockStudent(id));
    }
}
