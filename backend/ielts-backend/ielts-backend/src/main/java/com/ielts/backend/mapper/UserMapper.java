package com.ielts.backend.mapper;

import com.ielts.backend.dto.response.TeacherAccountResponse;
import com.ielts.backend.dto.response.UserResponse;
import com.ielts.backend.entity.Users;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse toResponse(Users user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .role(user.getRole())
                .status(user.getStatus())
                .bio(user.getBio())
                .phone(user.getPhone())
                .dateOfBirth(user.getDateOfBirth())
                .isActive(user.getIsActive())
                .lockReason(user.getLockReason())
                .emailVerified(user.getEmailVerified())
                .oauthProvider(user.getOauthProvider())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    public TeacherAccountResponse toTeacherAccountResponse(Users user, String temporaryPassword) {
        return toTeacherAccountResponse(user, temporaryPassword, 0L);
    }

    public TeacherAccountResponse toTeacherAccountResponse(Users user, String temporaryPassword, long courseCount) {
        return TeacherAccountResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .bio(user.getBio())
                .role(user.getRole())
                .status(user.getStatus())
                .isActive(user.getIsActive())
                .emailVerified(user.getEmailVerified())
                .lockReason(user.getLockReason())
                .courseCount(courseCount)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .temporaryPassword(temporaryPassword)
                .build();
    }
}
