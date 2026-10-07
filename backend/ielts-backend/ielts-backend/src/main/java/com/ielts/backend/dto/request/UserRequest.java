package com.ielts.backend.dto.request;

import com.ielts.backend.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UserRequest {

    @NotBlank
    @Email
    private String email;

    @Size(min = 8, max = 100)
    private String password;

    @NotBlank
    @Size(max = 255)
    private String fullName;

    private String avatarUrl;

    private Role role;

    private String bio;

    private String phone;

    private LocalDate dateOfBirth;
}
