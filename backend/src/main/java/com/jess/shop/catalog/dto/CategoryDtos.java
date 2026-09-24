package com.jess.shop.catalog.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public class CategoryDtos {

    public record CategoryResponse(UUID id, String name, String slug, String description, UUID parentCategoryId) {}

    public record CreateCategoryRequest(@NotBlank String name, @NotBlank String slug, String description, UUID parentCategoryId) {}
}
