package com.jess.shop.content.service;

import com.jess.shop.catalog.entity.Product;
import com.jess.shop.catalog.entity.ProductImage;
import com.jess.shop.catalog.entity.ProductStatus;
import com.jess.shop.catalog.entity.ProductVariant;
import com.jess.shop.catalog.repository.ProductImageRepository;
import com.jess.shop.catalog.repository.ProductRepository;
import com.jess.shop.catalog.repository.ProductVariantRepository;
import com.jess.shop.common.exception.ResourceNotFoundException;
import com.jess.shop.content.dto.HomeSectionDtos.AdminHomeSectionResponse;
import com.jess.shop.content.dto.HomeSectionDtos.AdminSectionProduct;
import com.jess.shop.content.dto.HomeSectionDtos.HomeSectionResponse;
import com.jess.shop.content.dto.HomeSectionDtos.PanelRequest;
import com.jess.shop.content.dto.HomeSectionDtos.PanelResponse;
import com.jess.shop.content.dto.HomeSectionDtos.SaveHomeSectionRequest;
import com.jess.shop.content.dto.HomeSectionDtos.SectionProductResponse;
import com.jess.shop.content.entity.HomeSection;
import com.jess.shop.content.entity.HomeSectionProduct;
import com.jess.shop.content.entity.HomeSectionType;
import com.jess.shop.content.repository.HomeSectionProductRepository;
import com.jess.shop.content.repository.HomeSectionRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

@Service
public class HomeSectionService {

    private final HomeSectionRepository sectionRepository;
    private final HomeSectionProductRepository linkRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductImageRepository imageRepository;

    public HomeSectionService(HomeSectionRepository sectionRepository, HomeSectionProductRepository linkRepository,
                              ProductRepository productRepository, ProductVariantRepository variantRepository,
                              ProductImageRepository imageRepository) {
        this.sectionRepository = sectionRepository;
        this.linkRepository = linkRepository;
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
        this.imageRepository = imageRepository;
    }

    // ---- storefront ----

    /** Active blocks in order. In a product row a product is only shown if it is ACTIVE and has stock, and a
     * row with nothing left to show is dropped entirely rather than rendering an empty row. */
    public List<HomeSectionResponse> listForStorefront() {
        List<HomeSectionResponse> blocks = new ArrayList<>();
        for (HomeSection s : sectionRepository.findByActiveTrueOrderBySortOrderAsc()) {
            switch (s.getType()) {
                case PRODUCTS -> {
                    List<SectionProductResponse> products = storefrontProducts(s.getId());
                    if (!products.isEmpty()) {
                        blocks.add(new HomeSectionResponse(s.getId(), s.getType(), s.getTitle(), null, null, null, null, products, List.of()));
                    }
                }
                case HANGING_RAIL -> {
                    List<SectionProductResponse> products = storefrontProducts(s.getId());
                    if (!products.isEmpty()) {
                        blocks.add(new HomeSectionResponse(s.getId(), s.getType(), s.getTitle(), s.getDescription(),
                            null, null, null, products, List.of()));
                    }
                }
                case HERO -> blocks.add(new HomeSectionResponse(s.getId(), s.getType(), s.getTitle(), s.getDescription(),
                    s.getImageUrl(), s.getButtonText(), s.getButtonLink(), List.of(), List.of()));
                case SPLIT_BANNER -> blocks.add(new HomeSectionResponse(s.getId(), s.getType(), null, null, null, null, null,
                    List.of(), panels(s)));
            }
        }
        return blocks;
    }

    private List<SectionProductResponse> storefrontProducts(UUID sectionId) {
        List<SectionProductResponse> result = new ArrayList<>();
        for (HomeSectionProduct link : linkRepository.findBySectionIdOrderBySortOrderAsc(sectionId)) {
            Product p = productRepository.findById(link.getProductId()).orElse(null);
            if (p == null || p.getStatus() != ProductStatus.ACTIVE || !inStock(p.getId())) {
                continue;
            }
            List<String> images = imageUrls(p.getId());
            result.add(new SectionProductResponse(p.getId(), p.getName(), p.getSlug(), p.getPrice(),
                images.isEmpty() ? null : images.get(0), images, true,
                p.getHangingImageUrl(), p.getHangingHookPercent()));
        }
        return result;
    }

    // ---- admin ----

    public List<AdminHomeSectionResponse> listForAdmin() {
        return sectionRepository.findAllByOrderBySortOrderAsc().stream().map(this::toAdminResponse).toList();
    }

    /** One block, for the edit page -- so opening an editor doesn't require having loaded the whole list. */
    public AdminHomeSectionResponse getForAdmin(UUID id) {
        return toAdminResponse(getOrThrow(id));
    }

    /** Every product, for the picker -- including drafts and sold-out ones, flagged so the admin can see why
     * a picked product might not appear on the storefront. */
    public List<AdminSectionProduct> productOptions() {
        return productRepository.findAll(Sort.by(Sort.Order.asc("name").ignoreCase())).stream()
            .map(this::toAdminProduct).toList();
    }

    @Transactional
    public AdminHomeSectionResponse create(SaveHomeSectionRequest request) {
        if (request.type() == null) {
            throw new IllegalStateException("Choose what kind of section to add");
        }
        HomeSection section = HomeSection.builder()
            .type(request.type())
            .title("")
            .sortOrder(sectionRepository.findMaxSortOrder() + 1)
            .build();
        apply(section, request);
        section = sectionRepository.save(section);
        if (usesProducts(section.getType())) {
            replaceProducts(section.getId(), request.productIds());
        }
        return toAdminResponse(section);
    }

    @Transactional
    public AdminHomeSectionResponse update(UUID id, SaveHomeSectionRequest request) {
        HomeSection section = getOrThrow(id);
        if (request.type() != null && request.type() != section.getType()) {
            throw new IllegalStateException("A section's type can't be changed -- add a new section instead");
        }
        apply(section, request);
        sectionRepository.save(section);
        if (usesProducts(section.getType())) {
            replaceProducts(id, request.productIds());
        }
        return toAdminResponse(section);
    }

    @Transactional
    public void delete(UUID id) {
        if (!sectionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Section not found: " + id);
        }
        sectionRepository.deleteById(id); // its product links go with it (ON DELETE CASCADE)
    }

    /** sectionIds is the desired top-to-bottom order of the blocks on the homepage. */
    @Transactional
    public void reorder(List<UUID> sectionIds) {
        int position = 0;
        for (UUID id : new LinkedHashSet<>(sectionIds)) {
            HomeSection section = getOrThrow(id);
            section.setSortOrder(position++);
            sectionRepository.save(section);
        }
    }

    // ---- helpers ----

    /** Copies the fields that belong to the section's type, and clears the ones that don't. */
    private void apply(HomeSection s, SaveHomeSectionRequest r) {
        s.setActive(r.active());
        switch (s.getType()) {
            case PRODUCTS -> {
                s.setTitle(requireText(r.title(), "Give the section a title"));
                s.setDescription(null);
                s.setImageUrl(null);
                s.setButtonText(null);
                s.setButtonLink(null);
                clearRightPanel(s);
            }
            case HANGING_RAIL -> {
                s.setTitle(requireText(r.title(), "Give the section a header"));
                s.setDescription(blankToNull(r.description()));
                s.setImageUrl(null);
                s.setButtonText(null);
                s.setButtonLink(null);
                clearRightPanel(s);
            }
            case HERO -> {
                s.setTitle(requireText(r.title(), "Give the hero a header"));
                s.setImageUrl(requireText(r.imageUrl(), "Choose an image for the hero"));
                s.setDescription(blankToNull(r.description()));
                s.setButtonText(blankToNull(r.buttonText()));
                s.setButtonLink(blankToNull(r.buttonLink()));
                clearRightPanel(s);
            }
            case SPLIT_BANNER -> {
                List<PanelRequest> panels = r.panels();
                if (panels == null || panels.size() != 2) {
                    throw new IllegalStateException("A split banner needs exactly two panels");
                }
                PanelRequest left = panels.get(0);
                PanelRequest right = panels.get(1);
                s.setTitle(left.title().trim());
                s.setDescription(blankToNull(left.description()));
                s.setImageUrl(left.imageUrl().trim());
                s.setRightTitle(right.title().trim());
                s.setRightDescription(blankToNull(right.description()));
                s.setRightImageUrl(right.imageUrl().trim());
                s.setButtonText(null);
                s.setButtonLink(null);
            }
        }
    }

    private void clearRightPanel(HomeSection s) {
        s.setRightTitle(null);
        s.setRightDescription(null);
        s.setRightImageUrl(null);
    }

    /** Whether a section type carries a hand-picked product list (home_section_product). */
    private boolean usesProducts(HomeSectionType type) {
        return type == HomeSectionType.PRODUCTS || type == HomeSectionType.HANGING_RAIL;
    }

    private void replaceProducts(UUID sectionId, List<UUID> productIds) {
        List<UUID> ids = productIds == null ? List.of() : new ArrayList<>(new LinkedHashSet<>(productIds));
        if (productRepository.findAllById(ids).size() != ids.size()) {
            throw new IllegalStateException("One or more of the selected products no longer exist -- reload and try again");
        }
        linkRepository.deleteAllBySection(sectionId);
        for (int i = 0; i < ids.size(); i++) {
            linkRepository.save(HomeSectionProduct.builder().sectionId(sectionId).productId(ids.get(i)).sortOrder(i).build());
        }
    }

    private HomeSection getOrThrow(UUID id) {
        return sectionRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Section not found: " + id));
    }

    private boolean inStock(UUID productId) {
        return variantRepository.findByProductId(productId).stream().anyMatch(v -> v.getStockQty() > 0);
    }

    private List<String> imageUrls(UUID productId) {
        return imageRepository.findByProductIdOrderBySortOrderAsc(productId).stream().map(ProductImage::getUrl).toList();
    }

    private List<PanelResponse> panels(HomeSection s) {
        return List.of(
            new PanelResponse(s.getImageUrl(), s.getTitle(), s.getDescription()),
            new PanelResponse(s.getRightImageUrl(), s.getRightTitle(), s.getRightDescription()));
    }

    private static String requireText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(message);
        }
        return value.trim();
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private AdminHomeSectionResponse toAdminResponse(HomeSection s) {
        List<AdminSectionProduct> products = !usesProducts(s.getType()) ? List.of()
            : linkRepository.findBySectionIdOrderBySortOrderAsc(s.getId()).stream()
                .map(link -> productRepository.findById(link.getProductId()).orElse(null))
                .filter(p -> p != null)
                .map(this::toAdminProduct)
                .toList();
        List<PanelResponse> panels = s.getType() == HomeSectionType.SPLIT_BANNER ? panels(s) : List.of();
        return new AdminHomeSectionResponse(s.getId(), s.getType(), s.isActive(), s.getSortOrder(), s.getTitle(),
            s.getDescription(), s.getImageUrl(), s.getButtonText(), s.getButtonLink(), panels, products);
    }

    private AdminSectionProduct toAdminProduct(Product p) {
        List<String> images = imageUrls(p.getId());
        boolean inStock = variantRepository.findByProductId(p.getId()).stream().map(ProductVariant::getStockQty).anyMatch(q -> q > 0);
        return new AdminSectionProduct(p.getId(), p.getName(), p.getPrice(), images.isEmpty() ? null : images.get(0), p.getStatus(), inStock,
            p.getHangingImageUrl(), p.getHangingHookPercent());
    }
}
