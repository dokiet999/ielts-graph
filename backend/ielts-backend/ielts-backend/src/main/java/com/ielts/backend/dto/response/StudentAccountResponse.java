package com.ielts.backend.dto.response;

import com.ielts.backend.enums.Role;
import com.ielts.backend.enums.UserStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class StudentAccountResponse {
    private UUID id;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private Role role;
    private UserStatus status;
    private Boolean isActive;
    private Boolean emailVerified;
    private String lockReason;
    private long enrollmentCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
