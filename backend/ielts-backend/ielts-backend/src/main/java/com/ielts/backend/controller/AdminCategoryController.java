package com.ielts.backend.controller;

import com.ielts.backend.common.BaseResponse;
import com.ielts.backend.constant.PaginationConstants;
import com.ielts.backend.dto.request.CategoryRequest;
import com.ielts.backend.dto.response.CategoryResponse;
import com.ielts.backend.service.AdminCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/categories")
@RequiredArgsConstructor
@Tag(name = "Admin - Categories", description = "Create, update, list and delete course categories")
public class AdminCategoryController {

    private final AdminCategoryService adminCategoryService;

    @GetMapping
    @Operation(summary = "List all categories filtered by active status and search keyword")
    public BaseResponse<List<CategoryResponse>> listCategories(
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_PAGE_STR) int page,
            @RequestParam(defaultValue = PaginationConstants.DEFAULT_SIZE_STR) int size) {
        PageRequest pageable = PaginationConstants.of(
                page,
                size,
                Sort.by(Sort.Direction.ASC, "ordering")
                        .and(Sort.by(Sort.Direction.ASC, "name"))
                        .and(Sort.by(Sort.Direction.ASC, "id")));
        return BaseResponse.ofSuccess(adminCategoryService.listCategories(isActive, q, pageable));
    }

    @PostMapping
    @Operation(summary = "Create a new course category")
    public ResponseEntity<BaseResponse<CategoryResponse>> createCategory(
            @Valid @RequestBody CategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(BaseResponse.ofCreated(adminCategoryService.createCategory(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a course category")
    public BaseResponse<CategoryResponse> updateCategory(
            @PathVariable UUID id,
            @Valid @RequestBody CategoryRequest request) {
        return BaseResponse.ofSuccess(adminCategoryService.updateCategory(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an unused category (returns 409 if assigned to courses)")
    public BaseResponse<Void> deleteCategory(@PathVariable UUID id) {
        adminCategoryService.deleteCategory(id);
        return BaseResponse.ofDeleteSuccess();
    }
}
