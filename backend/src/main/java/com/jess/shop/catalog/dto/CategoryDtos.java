package com.jess.shop.catalog.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public class CategoryDtos {

    private static final String SLUG_PATTERN = "^[a-z0-9]+(-[a-z0-9]+)*$";
    private static final String SLUG_MESSAGE = "must be lowercase letters, numbers and hyphens (e.g. long-sleeves)";

    public record CategoryResponse(UUID id, String name, String slug, String description, UUID parentCategoryId) {}

    /** Admin view of a category: same as the public one, plus how many products currently use it. */
    public record AdminCategoryResponse(UUID id, String name, String slug, String description, UUID parentCategoryId, long productCount) {}

    public record CreateCategoryRequest(
        @NotBlank String name,
        @NotBlank @Pattern(regexp = SLUG_PATTERN, message = SLUG_MESSAGE) String slug,
        String description,
        UUID parentCategoryId
    ) {}

    public record UpdateCategoryRequest(
        @NotBlank String name,
        @NotBlank @Pattern(regexp = SLUG_PATTERN, message = SLUG_MESSAGE) String slug,
        String description,
        UUID parentCategoryId
    ) {}
}
