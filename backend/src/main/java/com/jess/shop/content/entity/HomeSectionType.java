package com.jess.shop.content.entity;

public enum HomeSectionType {
    /** A titled row of hand-picked products. */
    PRODUCTS,
    /** A full-width banner with a header, description and optional button. */
    HERO,
    /** Two banners side by side, each with a header and description. */
    SPLIT_BANNER,
    /** Hand-picked products shown hanging on a rail (each using its hanging-photo cutout, falling back to its
     * normal thumbnail if it doesn't have one), with a header and description centered among them. For a
     * small, boutique-sized catalog where a plain product grid would look sparse. */
    HANGING_RAIL
}
