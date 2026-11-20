package com.ielts.backend.service.implement;

import com.ielts.backend.dto.response.StudentAccountResponse;
import com.ielts.backend.entity.Users;
import com.ielts.backend.enums.Role;
import com.ielts.backend.enums.UserStatus;
import com.ielts.backend.exception.customException.BadRequestException;
import com.ielts.backend.exception.customException.ConflictException;
import com.ielts.backend.exception.customException.ResourceNotFoundException;
import com.ielts.backend.repository.EnrollmentRepository;
import com.ielts.backend.repository.EnrollmentRepository.UserEnrollmentCount;
import com.ielts.backend.repository.UserRepository;
import com.ielts.backend.repository.UserSpecifications;
import com.ielts.backend.service.AdminStudentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminStudentServiceImpl implements AdminStudentService {

    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<StudentAccountResponse> listStudents(UserStatus status, String q, Pageable pageable) {
        List<Specification<Users>> specs = Stream.of(
                        UserSpecifications.hasRole(Role.STUDENT),
                        UserSpecifications.hasStatus(status),
                        UserSpecifications.matchesKeyword(q))
                .filter(Objects::nonNull)
                .toList();
        Page<Users> page = userRepository.findAll(Specification.allOf(specs), pageable);
        List<UUID> studentIds = page.getContent().stream().map(Users::getId).toList();
        Map<UUID, Long> enrollmentCounts = studentIds.isEmpty() ? Map.of()
                : enrollmentRepository.countActiveByUserIds(studentIds).stream()
                        .collect(Collectors.toMap(UserEnrollmentCount::getUserId, UserEnrollmentCount::getTotal));
        return page.map(student -> toResponse(student, enrollmentCounts.getOrDefault(student.getId(), 0L)));
    }

    @Override
    public StudentAccountResponse lockStudent(UUID id, String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("REASON_REQUIRED", "Lock reason is required");
        }
        Users student = findStudentOrThrow(id);
        if (student.getStatus() == UserStatus.LOCKED) {
            throw new ConflictException("ALREADY_LOCKED", "Student account is already locked");
        }
        student.setStatus(UserStatus.LOCKED);
        student.setIsActive(false);
        student.setLockReason(reason.trim());
        Users saved = userRepository.saveAndFlush(student);
        return toResponse(saved, enrollmentRepository.countByUserIdAndIsActiveTrue(id));
    }

    @Override
    public StudentAccountResponse unlockStudent(UUID id) {
        Users student = findStudentOrThrow(id);
        if (student.getStatus() != UserStatus.LOCKED) {
            throw new ConflictException("INVALID_STUDENT_STATUS", "Only LOCKED students can be unlocked");
        }
        student.setStatus(UserStatus.ACTIVE);
        student.setIsActive(true);
        student.setLockReason(null);
        Users saved = userRepository.saveAndFlush(student);
        return toResponse(saved, enrollmentRepository.countByUserIdAndIsActiveTrue(id));
    }

    private Users findStudentOrThrow(UUID id) {
        return userRepository.findByIdAndRole(id, Role.STUDENT)
                .orElseThrow(() -> new ResourceNotFoundException("Student", id));
    }

    private static StudentAccountResponse toResponse(Users student, long enrollmentCount) {
        return StudentAccountResponse.builder()
                .id(student.getId())
                .username(student.getUsername())
                .email(student.getEmail())
                .fullName(student.getFullName())
                .phone(student.getPhone())
                .role(student.getRole())
                .status(student.getStatus())
                .isActive(student.getIsActive())
                .emailVerified(student.getEmailVerified())
                .lockReason(student.getLockReason())
                .enrollmentCount(enrollmentCount)
                .createdAt(student.getCreatedAt())
                .updatedAt(student.getUpdatedAt())
                .build();
    }
}
