package com.ielts.backend.service.implement;

import com.ielts.backend.dto.request.CategoryRequest;
import com.ielts.backend.dto.response.CategoryResponse;
import com.ielts.backend.entity.Category;
import com.ielts.backend.exception.customException.BadRequestException;
import com.ielts.backend.exception.customException.ConflictException;
import com.ielts.backend.exception.customException.ResourceNotFoundException;
import com.ielts.backend.repository.CategoryRepository;
import com.ielts.backend.repository.CategorySpecifications;
import com.ielts.backend.repository.CourseRepository;
import com.ielts.backend.repository.CourseRepository.CategoryCourseCount;
import com.ielts.backend.service.AdminCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
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
public class AdminCategoryServiceImpl implements AdminCategoryService {

    private static final Pattern SLUG_PATTERN = Pattern.compile("^[a-z0-9]+(?:-[a-z0-9]+)*$");

    private final CategoryRepository categoryRepository;
    private final CourseRepository courseRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CategoryResponse> listActiveCategories() {
        List<Category> categories = categoryRepository.findByIsActiveTrueOrderByOrderingAscNameAsc();
        Map<UUID, Long> counts = countCoursesByCategoryIds(categories.stream().map(Category::getId).toList());
        return categories.stream()
                .map(c -> toResponse(c, counts.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CategoryResponse> listCategories(Boolean isActive, String q, Pageable pageable) {
        List<Specification<Category>> specs = Stream.of(
                        CategorySpecifications.hasIsActive(isActive),
                        CategorySpecifications.matchesKeyword(q))
                .filter(Objects::nonNull)
                .toList();
        Page<Category> page = categoryRepository.findAll(Specification.allOf(specs), pageable);
        List<UUID> ids = page.getContent().stream().map(Category::getId).toList();
        Map<UUID, Long> counts = countCoursesByCategoryIds(ids);
        return page.map(c -> toResponse(c, counts.getOrDefault(c.getId(), 0L)));
    }

    @Override
    public CategoryResponse createCategory(CategoryRequest request) {
        String slug = resolveAndValidateSlug(request.getSlug(), request.getName());
        if (categoryRepository.existsBySlugIgnoreCase(slug)) {
            throw new ConflictException("SLUG_TAKEN", "Category slug already exists");
        }

        Category category = Category.builder()
                .name(request.getName().trim())
                .slug(slug)
                .description(trimToNull(request.getDescription()))
                .iconUrl(trimToNull(request.getIconUrl()))
                .isActive(request.getIsActive() != null ? request.getIsActive() : Boolean.TRUE)
                .ordering(request.getOrdering() != null ? request.getOrdering() : 0)
                .build();

        Category saved = categoryRepository.saveAndFlush(category);
        return toResponse(saved, 0L);
    }

    @Override
    public CategoryResponse updateCategory(UUID id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));

        String slug = resolveAndValidateSlug(request.getSlug(), request.getName());
        if (categoryRepository.existsBySlugIgnoreCaseAndIdNot(slug, id)) {
            throw new ConflictException("SLUG_TAKEN", "Category slug already exists");
        }

        category.setName(request.getName().trim());
        category.setSlug(slug);
        category.setDescription(trimToNull(request.getDescription()));
        category.setIconUrl(trimToNull(request.getIconUrl()));
        if (request.getIsActive() != null) {
            category.setIsActive(request.getIsActive());
        }
        if (request.getOrdering() != null) {
            category.setOrdering(request.getOrdering());
        }

        Category saved = categoryRepository.saveAndFlush(category);
        long courseCount = courseRepository.countByCategoryId(id);
        return toResponse(saved, courseCount);
    }

    @Override
    public void deleteCategory(UUID id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", id));
        if (courseRepository.countByCategoryId(id) > 0) {
            throw new ConflictException("CATEGORY_IN_USE",
                    "Cannot delete a category that is assigned to courses; deactivate it instead");
        }
        categoryRepository.delete(category);
        categoryRepository.flush();
    }

    private Map<UUID, Long> countCoursesByCategoryIds(List<UUID> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return courseRepository.countByCategoryIds(ids).stream()
                .collect(Collectors.toMap(CategoryCourseCount::getCategoryId, CategoryCourseCount::getTotal));
    }

    private CategoryResponse toResponse(Category category, long courseCount) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .description(category.getDescription())
                .iconUrl(category.getIconUrl())
                .isActive(category.getIsActive())
                .ordering(category.getOrdering())
                .courseCount(courseCount)
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    private static String resolveAndValidateSlug(String rawSlug, String name) {
        String candidate = (rawSlug == null || rawSlug.isBlank())
                ? slugify(name)
                : rawSlug.trim().toLowerCase(Locale.ROOT);
        if (candidate.isEmpty() || candidate.length() > 255 || !SLUG_PATTERN.matcher(candidate).matches()) {
            throw new BadRequestException("INVALID_SLUG",
                    "Slug must contain lowercase letters, digits and hyphens");
        }
        return candidate;
    }

    private static String slugify(String input) {
        if (input == null) {
            return "";
        }
        String replaced = input.trim().replace('đ', 'd').replace('Đ', 'D');
        return Normalizer.normalize(replaced, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
