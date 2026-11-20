package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.dto.response.CategoryResponse;
import com.ielts.backend.service.AdminCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Categories", description = "Public active course categories")
public class CategoryController {

    private final AdminCategoryService adminCategoryService;

    @GetMapping
    @Operation(summary = "List active course categories ordered by display order")
    public BaseResponse<List<CategoryResponse>> listActiveCategories() {
        return BaseResponse.ofSuccess(adminCategoryService.listActiveCategories());
    }
}
