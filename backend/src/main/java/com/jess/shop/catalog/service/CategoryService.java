package com.jess.shop.catalog.service;

import com.jess.shop.catalog.dto.CategoryDtos.CategoryResponse;
import com.jess.shop.catalog.dto.CategoryDtos.CreateCategoryRequest;
import com.jess.shop.catalog.entity.Category;
import com.jess.shop.catalog.repository.CategoryRepository;
import com.jess.shop.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    public List<CategoryResponse> listAll() {
        return categoryRepository.findAll().stream().map(this::toResponse).toList();
    }

    public CategoryResponse create(CreateCategoryRequest request) {
        Category category = Category.builder()
            .name(request.name())
            .slug(request.slug())
            .description(request.description())
            .parentCategoryId(request.parentCategoryId())
            .build();
        return toResponse(categoryRepository.save(category));
    }

    public void delete(UUID id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category not found: " + id);
        }
        categoryRepository.deleteById(id);
    }

    private CategoryResponse toResponse(Category c) {
        return new CategoryResponse(c.getId(), c.getName(), c.getSlug(), c.getDescription(), c.getParentCategoryId());
    }
}
