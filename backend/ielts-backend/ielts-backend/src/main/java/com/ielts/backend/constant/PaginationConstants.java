package com.ielts.backend.constant;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

public final class PaginationConstants {

    private PaginationConstants() {
    }

    public static final int DEFAULT_PAGE = 0;
    public static final int DEFAULT_SIZE = 10;
    public static final int MAX_PAGE_SIZE = 100;

    public static final String DEFAULT_PAGE_STR = "0";
    public static final String DEFAULT_SIZE_STR = "10";

    public static PageRequest of(int page, int size, Sort sort) {
        return PageRequest.of(
                Math.max(page, DEFAULT_PAGE),
                Math.clamp(size, 1, MAX_PAGE_SIZE),
                sort
        );
    }
}
