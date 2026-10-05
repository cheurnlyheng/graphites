package com.jess.shop.content.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * One block of the storefront homepage; the homepage is these, in sort_order. Which fields are used depends
 * on the type: PRODUCTS uses title + {@link HomeSectionProduct} rows, HERO uses title/description/imageUrl/
 * buttonText/buttonLink, and SPLIT_BANNER uses title/description/imageUrl for the left panel and the right*
 * fields for the right panel.
 */
@Entity
@Table(name = "home_section")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HomeSection {

    @Id
    @GeneratedValue
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private HomeSectionType type;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(length = 300)
    private String description;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "button_text", length = 40)
    private String buttonText;

    @Column(name = "button_link", length = 300)
    private String buttonLink;

    @Column(name = "right_title", length = 120)
    private String rightTitle;

    @Column(name = "right_description", length = 300)
    private String rightDescription;

    @Column(name = "right_image_url", length = 500)
    private String rightImageUrl;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    /** Inactive blocks are kept in the admin but not shown on the storefront. */
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
