-- Curated rows on the storefront homepage ("New Arrivals", "Flash Sale", ...). Each section holds a
-- hand-picked, ordered list of products -- they are not tied to a category.
CREATE TABLE home_section (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title      VARCHAR(120) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE home_section_product (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES home_section (id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES product (id) ON DELETE CASCADE,
    sort_order INT  NOT NULL DEFAULT 0,
    UNIQUE (section_id, product_id)
);

CREATE INDEX idx_home_section_product_section ON home_section_product (section_id, sort_order);
