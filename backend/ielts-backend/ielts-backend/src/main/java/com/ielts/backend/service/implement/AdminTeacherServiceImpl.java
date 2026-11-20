package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.CreateTeacherRequest;
import com.ielts.backend.dto.request.UpdateTeacherRequest;
import com.ielts.backend.dto.response.TeacherAccountResponse;
import com.ielts.backend.entity.Users;
import com.ielts.backend.enums.Role;
import com.ielts.backend.enums.UserStatus;
import com.ielts.backend.exception.customException.BadRequestException;
import com.ielts.backend.exception.customException.ConflictException;
import com.ielts.backend.exception.customException.ResourceNotFoundException;
import com.ielts.backend.mapper.UserMapper;
import com.ielts.backend.repository.CourseRepository;
import com.ielts.backend.repository.CourseRepository.TeacherCourseCount;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.repository.UserSpecifications;
import com.ielts.backend.security.DbUserDetailsService;
import com.ielts.backend.service.AdminTeacherService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminTeacherServiceImpl implements AdminTeacherService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-z0-9_.]{3,50}$");
    private static final int TEMP_PASSWORD_LENGTH = 12;
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String LOWER = "abcdefghijkmnopqrstuvwxyz";
    private static final String DIGITS = "23456789";
    private static final String ALL_CHARS = UPPER + LOWER + DIGITS;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    @Override
    public TeacherAccountResponse createTeacher(CreateTeacherRequest request) {
        String username = DbUserDetailsService.normalize(request.getUsername());
        if (username == null || !USERNAME_PATTERN.matcher(username).matches()) {
            throw new BadRequestException("INVALID_USERNAME",
                    "Username must be 3-50 characters using lowercase letters, digits, '_' or '.'");
        }

        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByUsername(username)) {
            throw new ConflictException("USERNAME_TAKEN", "Username already exists");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("EMAIL_TAKEN", "Email already exists");
        }

        String rawPassword;
        String temporaryPassword = null;
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            rawPassword = generateTemporaryPassword();
            temporaryPassword = rawPassword;
        } else {
            rawPassword = request.getPassword();
            if (rawPassword.length() < 8 || rawPassword.length() > 100) {
                throw new BadRequestException("INVALID_PASSWORD",
                        "Password must be between 8 and 100 characters");
            }
        }

        Users teacher = Users.builder()
                .username(username)
                .email(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .fullName(request.getFullName().trim())
                .phone(trimToNull(request.getPhone()))
                .bio(trimToNull(request.getBio()))
                .role(Role.TEACHER)
                .status(UserStatus.ACTIVE)
                .isActive(true)
                .emailVerified(false)
                .build();

        Users saved = userRepository.saveAndFlush(teacher);
        return userMapper.toTeacherAccountResponse(saved, temporaryPassword);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<TeacherAccountResponse> listTeachers(UserStatus status, String q, Pageable pageable) {
        List<Specification<Users>> specs = Stream.of(
                        UserSpecifications.hasRole(Role.TEACHER),
                        UserSpecifications.hasStatus(status),
                        UserSpecifications.matchesKeyword(q))
                .filter(Objects::nonNull)
                .toList();
        Page<Users> page = userRepository.findAll(Specification.allOf(specs), pageable);
        List<UUID> teacherIds = page.getContent().stream().map(Users::getId).toList();
        Map<UUID, Long> courseCounts = teacherIds.isEmpty() ? Map.of()
                : courseRepository.countByTeacherIds(teacherIds).stream()
                        .collect(Collectors.toMap(TeacherCourseCount::getTeacherId, TeacherCourseCount::getTotal));
        return page.map(user -> userMapper.toTeacherAccountResponse(
                user, null, courseCounts.getOrDefault(user.getId(), 0L)));
    }

    @Override
    @Transactional(readOnly = true)
    public TeacherAccountResponse getTeacher(UUID id) {
        Users teacher = findTeacherOrThrow(id);
        return userMapper.toTeacherAccountResponse(teacher, null, courseRepository.countByTeacherId(id));
    }

    @Override
    public TeacherAccountResponse updateTeacher(UUID id, UpdateTeacherRequest request) {
        Users teacher = findTeacherOrThrow(id);
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new ConflictException("EMAIL_TAKEN", "Email already exists");
        }
        teacher.setEmail(email);
        teacher.setFullName(request.getFullName().trim());
        teacher.setPhone(trimToNull(request.getPhone()));
        teacher.setBio(trimToNull(request.getBio()));
        Users saved = userRepository.saveAndFlush(teacher);
        return userMapper.toTeacherAccountResponse(saved, null, courseRepository.countByTeacherId(id));
    }

    @Override
    public TeacherAccountResponse resetTeacherPassword(UUID id) {
        Users teacher = findTeacherOrThrow(id);
        String temporaryPassword = generateTemporaryPassword();
        teacher.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        Users saved = userRepository.saveAndFlush(teacher);
        return userMapper.toTeacherAccountResponse(saved, temporaryPassword, courseRepository.countByTeacherId(id));
    }

    @Override
    public TeacherAccountResponse approveTeacher(UUID id) {
        Users teacher = findTeacherOrThrow(id);
        if (teacher.getStatus() != UserStatus.PENDING) {
            throw new ConflictException("INVALID_TEACHER_STATUS", "Only PENDING teachers can be approved");
        }
        teacher.setStatus(UserStatus.ACTIVE);
        teacher.setIsActive(true);
        teacher.setLockReason(null);
        return userMapper.toTeacherAccountResponse(
                userRepository.saveAndFlush(teacher), null, courseRepository.countByTeacherId(id));
    }

    @Override
    public TeacherAccountResponse lockTeacher(UUID id, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("REASON_REQUIRED", "Lock reason is required");
        }
        Users teacher = findTeacherOrThrow(id);
        if (teacher.getStatus() == UserStatus.LOCKED) {
            throw new ConflictException("ALREADY_LOCKED", "Teacher account is already locked");
        }
        teacher.setStatus(UserStatus.LOCKED);
        teacher.setIsActive(false);
        teacher.setLockReason(reason.trim());
        return userMapper.toTeacherAccountResponse(
                userRepository.saveAndFlush(teacher), null, courseRepository.countByTeacherId(id));
    }

    @Override
    public TeacherAccountResponse unlockTeacher(UUID id) {
        Users teacher = findTeacherOrThrow(id);
        if (teacher.getStatus() != UserStatus.LOCKED) {
            throw new ConflictException("INVALID_TEACHER_STATUS", "Only LOCKED teachers can be unlocked");
        }
        teacher.setStatus(UserStatus.ACTIVE);
        teacher.setIsActive(true);
        teacher.setLockReason(null);
        return userMapper.toTeacherAccountResponse(
                userRepository.saveAndFlush(teacher), null, courseRepository.countByTeacherId(id));
    }

    private Users findTeacherOrThrow(UUID id) {
        return userRepository.findByIdAndRole(id, Role.TEACHER)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher", id));
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static String generateTemporaryPassword() {
        List<Character> chars = new ArrayList<>(TEMP_PASSWORD_LENGTH);
        chars.add(UPPER.charAt(RANDOM.nextInt(UPPER.length())));
        chars.add(LOWER.charAt(RANDOM.nextInt(LOWER.length())));
        chars.add(DIGITS.charAt(RANDOM.nextInt(DIGITS.length())));
        for (int i = chars.size(); i < TEMP_PASSWORD_LENGTH; i++) {
            chars.add(ALL_CHARS.charAt(RANDOM.nextInt(ALL_CHARS.length())));
        }
        Collections.shuffle(chars, RANDOM);
        StringBuilder sb = new StringBuilder(TEMP_PASSWORD_LENGTH);
        for (char c : chars) {
            sb.append(c);
        }
        return sb.toString();
    }
}

