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
    @Size(max = 255)
    private String email;

    @Size(min = 8, max = 100)
    private String password;

    @NotBlank
    @Size(max = 255)
    private String fullName;

    @Size(max = 512)
    private String avatarUrl;

    private Role role;

    private String bio;

    @Size(max = 20)
    private String phone;

    private LocalDate dateOfBirth;
}
