package com.ielts.backend.dto.response;

import com.ielts.backend.enums.Role;
import com.ielts.backend.enums.UserStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class UserResponse {
    private UUID id;
    private String username;
    private String email;
    private String fullName;
    private String avatarUrl;
    private Role role;
    private UserStatus status;
    private String bio;
    private String phone;
    private LocalDate dateOfBirth;
    private Boolean isActive;
    private String lockReason;
    private Boolean emailVerified;
    private String oauthProvider;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
