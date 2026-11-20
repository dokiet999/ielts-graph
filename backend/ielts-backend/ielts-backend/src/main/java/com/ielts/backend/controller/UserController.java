package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.dto.response.UserResponse;
import com.ielts.backend.entity.Users;
import com.ielts.backend.exception.customException.UnauthorizedException;
import com.ielts.backend.mapper.UserMapper;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.security.DbUserDetailsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "Current user profile")
public class UserController {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @GetMapping("/me")
    @Operation(summary = "Get the currently authenticated user profile")
    public BaseResponse<UserResponse> getMe(@AuthenticationPrincipal UserDetails principal) {
        Users user = userRepository.findByUsername(DbUserDetailsService.normalize(principal.getUsername()))
                .orElseThrow(() -> new UnauthorizedException("Unknown user"));
        return BaseResponse.ofSuccess(userMapper.toResponse(user));
    }
}
