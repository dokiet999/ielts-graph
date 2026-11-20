package com.ielts.backend.repository;

import com.ielts.backend.entity.Category;
import org.springframework.data.jpa.domain.Specification;

import java.util.Locale;

public final class CategorySpecifications {

    private CategorySpecifications() {
    }

    public static Specification<Category> hasIsActive(Boolean isActive) {
        return isActive == null ? null : (root, query, cb) -> cb.equal(root.get("isActive"), isActive);
    }

    public static Specification<Category> matchesKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        String pattern = "%" + escapeLike(keyword.trim().toLowerCase(Locale.ROOT)) + "%";
        return (root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("name")), pattern, '\\'),
                cb.like(cb.lower(root.get("slug")), pattern, '\\'));
    }

    private static String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
