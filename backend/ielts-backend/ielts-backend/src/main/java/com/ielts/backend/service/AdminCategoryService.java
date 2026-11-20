package com.ielts.backend.service;

import com.ielts.backend.dto.request.CategoryRequest;
import com.ielts.backend.dto.response.CategoryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface AdminCategoryService {

    List<CategoryResponse> listActiveCategories();

    Page<CategoryResponse> listCategories(Boolean isActive, String q, Pageable pageable);

    CategoryResponse createCategory(CategoryRequest request);

    CategoryResponse updateCategory(UUID id, CategoryRequest request);

    void deleteCategory(UUID id);
}
