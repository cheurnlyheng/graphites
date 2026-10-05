package com.jess.shop.content.dto;

import com.jess.shop.catalog.entity.ProductStatus;
import com.jess.shop.content.entity.HomeSectionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public class HomeSectionDtos {

    private static final String IMAGE_PATTERN = "^(/|https?://).+";
    private static final String IMAGE_MESSAGE = "must be an uploaded image or a full http(s) URL";
    // Rendered as a link's href, so only allow a site path, an anchor, or http(s) -- never javascript:
    private static final String LINK_PATTERN = "^$|^(/|#|https?://).*";
    private static final String LINK_MESSAGE = "must be a path like /products or a full http(s) URL";

    // ---- storefront ----

    /** `images` is every image of the product in order (one per color), so a card can show its color dots.
     * `hangingImageUrl`/`hangingHookPercent` are only used by a HANGING_RAIL block -- null for every other
     * type, and null here just means that product falls back to `thumbnailUrl` on the rail too. */
    public record SectionProductResponse(UUID id, String name, String slug, BigDecimal price, String thumbnailUrl,
                                         List<String> images, boolean inStock,
                                         String hangingImageUrl, BigDecimal hangingHookPercent) {}

    /** One side of a split banner. */
    public record PanelResponse(String imageUrl, String title, String description) {}

    /** A homepage block. Only the fields for its `type` are filled; the lists are empty for other types. */
    public record HomeSectionResponse(UUID id, HomeSectionType type, String title, String description, String imageUrl,
                                      String buttonText, String buttonLink,
                                      List<SectionProductResponse> products, List<PanelResponse> panels) {}

    // ---- admin ----

    /** A product as the admin sees it, including ones the storefront hides (drafts, sold out). */
    public record AdminSectionProduct(UUID id, String name, BigDecimal price, String thumbnailUrl,
                                      ProductStatus status, boolean inStock,
                                      String hangingImageUrl, BigDecimal hangingHookPercent) {}

    public record AdminHomeSectionResponse(UUID id, HomeSectionType type, boolean active, int sortOrder,
                                           String title, String description, String imageUrl,
                                           String buttonText, String buttonLink,
                                           List<PanelResponse> panels, List<AdminSectionProduct> products) {}

    public record PanelRequest(
        @NotBlank @Size(max = 500) @Pattern(regexp = IMAGE_PATTERN, message = IMAGE_MESSAGE) String imageUrl,
        @NotBlank @Size(max = 120) String title,
        @Size(max = 300) String description
    ) {}

    /**
     * Saves any type of block; the fields that don't apply to the type are ignored. `type` is only needed
     * when creating (a block's type can't change afterwards). productIds is the full, ordered list of
     * products for a PRODUCTS block; panels is the [left, right] pair for a SPLIT_BANNER.
     */
    public record SaveHomeSectionRequest(
        HomeSectionType type,
        boolean active,
        @Size(max = 120) String title,
        @Size(max = 300) String description,
        @Size(max = 500) @Pattern(regexp = IMAGE_PATTERN, message = IMAGE_MESSAGE) String imageUrl,
        @Size(max = 40) String buttonText,
        @Size(max = 300) @Pattern(regexp = LINK_PATTERN, message = LINK_MESSAGE) String buttonLink,
        @Valid List<PanelRequest> panels,
        @Size(max = 30, message = "a section can hold at most 30 products") List<UUID> productIds
    ) {}

    public record ReorderSectionsRequest(@NotNull List<UUID> sectionIds) {}

    /** hookPercent is only populated when the upload requested transparent-padding trimming (hanging-rail
     * cutouts) and trimming actually happened -- null for every ordinary product photo upload. */
    public record UploadResponse(String url, java.math.BigDecimal hookPercent) {}
}
