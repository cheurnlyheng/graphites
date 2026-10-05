package com.jess.shop.catalog.service;

import com.jess.shop.catalog.dto.CategoryDtos.AdminCategoryResponse;
import com.jess.shop.catalog.dto.CategoryDtos.CategoryResponse;
import com.jess.shop.catalog.dto.CategoryDtos.CreateCategoryRequest;
import com.jess.shop.catalog.dto.CategoryDtos.UpdateCategoryRequest;
import com.jess.shop.catalog.entity.Category;
import com.jess.shop.catalog.repository.CategoryRepository;
import com.jess.shop.catalog.repository.ProductRepository;
import com.jess.shop.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public CategoryService(CategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    public List<CategoryResponse> listAll() {
        return categoryRepository.findAll().stream()
            .sorted(Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER))
            .map(this::toResponse)
            .toList();
    }

    public List<AdminCategoryResponse> listAllForAdmin() {
        return categoryRepository.findAll().stream()
            .sorted(Comparator.comparing(Category::getName, String.CASE_INSENSITIVE_ORDER))
            .map(this::toAdminResponse)
            .toList();
    }

    public AdminCategoryResponse get(UUID id) {
        return toAdminResponse(getOrThrow(id));
    }

    @Transactional
    public AdminCategoryResponse create(CreateCategoryRequest request) {
        requireSlugAvailable(request.slug(), null);
        requireValidParent(request.parentCategoryId(), null);
        Category category = Category.builder()
            .name(request.name().trim())
            .slug(request.slug())
            .description(blankToNull(request.description()))
            .parentCategoryId(request.parentCategoryId())
            .build();
        return toAdminResponse(categoryRepository.save(category));
    }

    @Transactional
    public AdminCategoryResponse update(UUID id, UpdateCategoryRequest request) {
        Category category = getOrThrow(id);
        requireSlugAvailable(request.slug(), id);
        requireValidParent(request.parentCategoryId(), id);
        category.setName(request.name().trim());
        category.setSlug(request.slug());
        category.setDescription(blankToNull(request.description()));
        category.setParentCategoryId(request.parentCategoryId());
        return toAdminResponse(categoryRepository.save(category));
    }

    /** Products in the category become uncategorized and its subcategories become top-level
     * (both are ON DELETE SET NULL in the schema) -- nothing else is deleted. */
    @Transactional
    public void delete(UUID id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category not found: " + id);
        }
        categoryRepository.deleteById(id);
    }

    private Category getOrThrow(UUID id) {
        return categoryRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
    }

    private void requireSlugAvailable(String slug, UUID excludeId) {
        categoryRepository.findBySlug(slug).ifPresent(existing -> {
            if (!existing.getId().equals(excludeId)) {
                throw new IllegalStateException("A category with the slug '" + slug + "' already exists");
            }
        });
    }

    /** The parent must exist, can't be the category itself, and can't be one of its own descendants
     * (that would make the tree loop back on itself). */
    private void requireValidParent(UUID parentId, UUID selfId) {
        if (parentId == null) return;
        if (parentId.equals(selfId)) {
            throw new IllegalStateException("A category can't be its own parent");
        }
        Category parent = getOrThrow(parentId);
        if (selfId == null) return;
        for (UUID up = parent.getParentCategoryId(); up != null; up = categoryRepository.findById(up).map(Category::getParentCategoryId).orElse(null)) {
            if (up.equals(selfId)) {
                throw new IllegalStateException("A category can't be moved under one of its own subcategories");
            }
        }
    }

    private String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private CategoryResponse toResponse(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getSlug(), c.getDescription(), c.getParentCategoryId());
    }

    private AdminCategoryResponse toAdminResponse(Category c) {
        return new AdminCategoryResponse(c.getId(), c.getName(), c.getSlug(), c.getDescription(), c.getParentCategoryId(),
            productRepository.countByCategoryId(c.getId()));
    }
}
