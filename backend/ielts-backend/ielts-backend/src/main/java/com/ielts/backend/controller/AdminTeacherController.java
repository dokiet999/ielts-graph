package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.constant.PaginationConstants;
import com.ielts.backend.dto.request.CreateTeacherRequest;
import com.ielts.backend.dto.request.LockUserRequest;
import com.ielts.backend.dto.request.UpdateTeacherRequest;
import com.ielts.backend.dto.response.TeacherAccountResponse;
import com.ielts.backend.enums.UserStatus;
import com.ielts.backend.service.AdminTeacherService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/teachers")
@RequiredArgsConstructor
@Tag(name = "Admin - Teachers", description = "Create, list, approve, lock and unlock teacher accounts")
public class AdminTeacherController {

    private final AdminTeacherService adminTeacherService;

    @PostMapping
    @Operation(summary = "Create a teacher account (returns a one-time temporaryPassword when password is omitted)")
    public ResponseEntity<BaseResponse<TeacherAccountResponse>> createTeacher(
            @Valid @RequestBody CreateTeacherRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.ofCreated(adminTeacherService.createTeacher(request)));
    }

    @GetMapping
    @Operation(summary = "List teacher accounts filtered by status and search keyword")
    public BaseResponse<List<TeacherAccountResponse>> listTeachers(
            @RequestParam(required = false) UserStatus status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_PAGE_STR) int page,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_SIZE_STR) int size) {
        PageRequest pageable = PaginationConstants.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.ASC, "id")));
        return BaseResponse.ofSuccess(adminTeacherService.listTeachers(status, q, pageable));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get teacher account detail")
    public BaseResponse<TeacherAccountResponse> getTeacher(@PathVariable UUID id) {
        return BaseResponse.ofSuccess(adminTeacherService.getTeacher(id));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a teacher account's profile details")
    public BaseResponse<TeacherAccountResponse> updateTeacher(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateTeacherRequest request) {
        return BaseResponse.ofSuccess(adminTeacherService.updateTeacher(id, request));
    }

    @PostMapping("/{id}/reset-password")
    @Operation(summary = "Reset a teacher password and return a one-time temporaryPassword")
    public BaseResponse<TeacherAccountResponse> resetPassword(@PathVariable UUID id) {
        return BaseResponse.ofSuccess(adminTeacherService.resetTeacherPassword(id));
    }

    @PostMapping("/{id}/approve")
    @Operation(summary = "Approve a PENDING teacher account")
    public BaseResponse<TeacherAccountResponse> approveTeacher(@PathVariable UUID id) {
        return BaseResponse.ofSuccess(adminTeacherService.approveTeacher(id));
    }

    @PostMapping("/{id}/lock")
    @Operation(summary = "Lock a teacher account with a reason")
    public BaseResponse<TeacherAccountResponse> lockTeacher(
            @PathVariable UUID id,
            @Valid @RequestBody LockUserRequest request) {
        return BaseResponse.ofSuccess(adminTeacherService.lockTeacher(id, request.getReason()));
    }

    @PostMapping("/{id}/unlock")
    @Operation(summary = "Unlock a LOCKED teacher account")
    public BaseResponse<TeacherAccountResponse> unlockTeacher(@PathVariable UUID id) {
        return BaseResponse.ofSuccess(adminTeacherService.unlockTeacher(id));
    }
}

