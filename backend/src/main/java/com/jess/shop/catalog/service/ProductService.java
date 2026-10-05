package com.jess.shop.catalog.service;

import com.jess.shop.catalog.dto.ProductDtos.*;
import com.jess.shop.catalog.entity.Product;
import com.jess.shop.catalog.entity.ProductImage;
import com.jess.shop.catalog.entity.ProductStatus;
import com.jess.shop.catalog.entity.ProductVariant;
import com.jess.shop.catalog.repository.ProductImageRepository;
import com.jess.shop.catalog.repository.ProductRepository;
import com.jess.shop.catalog.repository.ProductVariantRepository;
import com.jess.shop.common.exception.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductImageRepository imageRepository;

    public ProductService(ProductRepository productRepository, ProductVariantRepository variantRepository,
                           ProductImageRepository imageRepository) {
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
        this.imageRepository = imageRepository;
    }

    // ---- Public storefront reads (ACTIVE products only) ----

    public Page<ProductSummaryResponse> browseActive(UUID categoryId, String search, Pageable pageable) {
        Page<Product> page;
        if (search != null && !search.isBlank()) {
            page = productRepository.search(search, pageable);
        } else if (categoryId != null) {
            page = productRepository.findByStatusAndCategoryId(ProductStatus.ACTIVE, categoryId, pageable);
        } else {
            page = productRepository.findByStatus(ProductStatus.ACTIVE, pageable);
        }
        return toSummaries(page);
    }

    public ProductDetailResponse getActiveBySlug(String slug) {
        Product product = productRepository.findBySlug(slug)
            .filter(p -> p.getStatus() == ProductStatus.ACTIVE)
            .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + slug));
        return toDetail(product);
    }

    // ---- Admin reads/writes (any status) ----

    public Page<ProductSummaryResponse> adminList(Pageable pageable) {
        return toSummaries(productRepository.findAll(pageable));
    }

    public ProductDetailResponse adminGet(UUID id) {
        return toDetail(getOrThrow(id));
    }

    @Transactional
    public ProductDetailResponse create(CreateProductRequest request) {
        Product product = Product.builder()
            .categoryId(request.categoryId())
            .name(request.name())
            .slug(request.slug())
            .description(request.description())
            .status(request.status() != null ? request.status() : ProductStatus.DRAFT)
            .weightGrams(request.weightGrams())
            .taxCode(request.taxCode())
            .price(request.price())
            .hangingImageUrl(blankToNull(request.hangingImageUrl()))
            .hangingHookPercent(request.hangingHookPercent())
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
        product = productRepository.save(product);

        List<VariantRequest> variantRequests = request.variants();
        if (variantRequests == null || variantRequests.isEmpty()) {
            // Every product needs at least one variant, even a "simple" one with no real size/color options.
            variantRequests = List.of(new VariantRequest(null, null, null, 0, 5));
        }
        for (VariantRequest v : variantRequests) {
            saveVariant(product.getId(), product.getSlug(), v);
        }

        if (request.images() != null) {
            for (ImageRequest img : request.images()) {
                saveImage(product.getId(), img);
            }
        }

        return toDetail(product);
    }

    @Transactional
    public ProductDetailResponse update(UUID id, UpdateProductRequest request) {
        Product product = getOrThrow(id);
        product.setName(request.name());
        product.setDescription(request.description());
        product.setCategoryId(request.categoryId());
        if (request.status() != null) {
            product.setStatus(request.status());
        }
        product.setTaxCode(request.taxCode());
        product.setWeightGrams(request.weightGrams());
        product.setPrice(request.price());
        product.setHangingImageUrl(blankToNull(request.hangingImageUrl()));
        product.setHangingHookPercent(request.hangingHookPercent());
        product.setUpdatedAt(Instant.now());
        return toDetail(productRepository.save(product));
    }

    @Transactional
    public void delete(UUID id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product not found: " + id);
        }
        productRepository.deleteById(id); // variants/images cascade via FK ON DELETE CASCADE
    }

    @Transactional
    public VariantResponse addVariant(UUID productId, VariantRequest request) {
        Product product = getOrThrow(productId);
        return toVariantResponse(saveVariant(productId, product.getSlug(), request));
    }

    @Transactional
    public VariantResponse updateVariantStock(UUID variantId, UpdateVariantRequest request) {
        ProductVariant variant = variantRepository.findById(variantId)
            .orElseThrow(() -> new ResourceNotFoundException("Variant not found: " + variantId));
        if (request.stockQty() != null) {
            variant.setStockQty(request.stockQty());
        }
        if (request.lowStockThreshold() != null) {
            variant.setLowStockThreshold(request.lowStockThreshold());
        }
        return toVariantResponse(variantRepository.save(variant));
    }

    @Transactional
    public void deleteVariant(UUID variantId) {
        variantRepository.deleteById(variantId);
    }

    @Transactional
    public ImageResponse addImage(UUID productId, ImageRequest request) {
        getOrThrow(productId);
        return toImageResponse(saveImage(productId, request));
    }

    @Transactional
    public void deleteImage(UUID imageId) {
        imageRepository.deleteById(imageId);
    }

    // ---- helpers ----

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private Product getOrThrow(UUID id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
    }

    private ProductVariant saveVariant(UUID productId, String productSlug, VariantRequest request) {
        String sku = (request.sku() == null || request.sku().isBlank())
            ? buildSku(productSlug, request.size(), request.color())
            : request.sku();

        ProductVariant variant = ProductVariant.builder()
            .productId(productId)
            .sku(sku)
            .size(request.size())
            .color(request.color())
            .stockQty(request.stockQty() == null ? 0 : request.stockQty())
            .lowStockThreshold(request.lowStockThreshold() == null ? 5 : request.lowStockThreshold())
            .build();
        return variantRepository.save(variant);
    }

    /** e.g. "classic-cotton-tee-M-GREEN" -- readable and unique enough for a boutique catalog;
     * falls back to a random suffix only if size/color are both blank (a truly simple product). */
    private String buildSku(String productSlug, String size, String color) {
        StringBuilder sku = new StringBuilder(productSlug.toUpperCase());
        if (size != null && !size.isBlank()) sku.append('-').append(size.toUpperCase());
        if (color != null && !color.isBlank()) sku.append('-').append(color.toUpperCase());
        if (size == null && color == null) sku.append('-').append(UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        return sku.toString();
    }

    private ProductImage saveImage(UUID productId, ImageRequest request) {
        ProductImage image = ProductImage.builder()
            .productId(productId)
            .colorGroup(request.colorGroup())
            .url(request.url())
            .sortOrder(request.sortOrder() == null ? 0 : request.sortOrder())
            .build();
        return imageRepository.save(image);
    }

    /** Batch-loads variants and images for every product on the page in 2 queries total, instead of
     * 2 queries per product -- a plain per-product toSummary() turned a 36-item page into 73 DB
     * round trips, which is cheap locally but adds up fast against a network-hosted database. */
    private Page<ProductSummaryResponse> toSummaries(Page<Product> page) {
        List<UUID> productIds = page.getContent().stream().map(Product::getId).toList();
        if (productIds.isEmpty()) {
            return page.map(p -> toSummary(p, List.of(), List.of()));
        }

        Map<UUID, List<ProductVariant>> variantsByProduct = variantRepository.findByProductIdIn(productIds)
            .stream().collect(Collectors.groupingBy(ProductVariant::getProductId));
        Map<UUID, List<ProductImage>> imagesByProduct = imageRepository.findByProductIdInOrderBySortOrderAsc(productIds)
            .stream().collect(Collectors.groupingBy(ProductImage::getProductId));

        return page.map(product -> toSummary(product,
            variantsByProduct.getOrDefault(product.getId(), List.of()),
            imagesByProduct.getOrDefault(product.getId(), List.of())));
    }

    private ProductSummaryResponse toSummary(Product product, List<ProductVariant> variants, List<ProductImage> productImages) {
        boolean inStock = variants.stream().anyMatch(v -> v.getStockQty() > 0);
        List<String> images = productImages.stream().map(ProductImage::getUrl).toList();
        String thumbnail = images.isEmpty() ? null : images.get(0);
        return new ProductSummaryResponse(product.getId(), product.getName(), product.getSlug(), product.getPrice(),
            thumbnail, images, inStock, product.getStatus());
    }

    private ProductDetailResponse toDetail(Product product) {
        List<VariantResponse> variants = variantRepository.findByProductId(product.getId())
            .stream().map(this::toVariantResponse).toList();
        List<ImageResponse> images = imageRepository.findByProductIdOrderBySortOrderAsc(product.getId())
            .stream().map(this::toImageResponse).toList();
        return new ProductDetailResponse(
            product.getId(), product.getName(), product.getSlug(), product.getDescription(),
            product.getCategoryId(), product.getStatus(), product.getTaxCode(), product.getPrice(), variants, images,
            product.getHangingImageUrl(), product.getHangingHookPercent()
        );
    }

    private VariantResponse toVariantResponse(ProductVariant v) {
        return new VariantResponse(v.getId(), v.getSku(), v.getSize(), v.getColor(), v.getStockQty(), v.getStockQty() > 0);
    }

    private ImageResponse toImageResponse(ProductImage i) {
        return new ImageResponse(i.getId(), i.getColorGroup(), i.getUrl(), i.getSortOrder());
    }
}
