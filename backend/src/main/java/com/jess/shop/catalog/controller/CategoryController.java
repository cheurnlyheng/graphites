package com.jess.shop.catalog.controller;

import com.jess.shop.catalog.dto.CategoryDtos.CategoryResponse;
import com.jess.shop.catalog.service.CategoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    public List<CategoryResponse> listAll() {
        return categoryService.listAll();
    }
}
