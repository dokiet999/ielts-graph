package com.ielts.backend.enums;

public enum UserStatus {
    /** Teacher account waiting for admin approval (FR-1.02). */
    PENDING,
    ACTIVE,
    /** Blocked by an admin (FR-7.01). */
    LOCKED
}
