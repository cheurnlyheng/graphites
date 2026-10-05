-- The homepage is an ordered list of blocks: a row of hand-picked products, a hero banner, or a split
-- banner (two panels side by side). home_section already is that ordered list, so it gains a type and the
-- content fields the other two types need.
--   PRODUCTS      title + products (home_section_product)
--   HERO          title (header), description, image_url, button_text, button_link
--   SPLIT_BANNER  left panel = title, description, image_url; right panel = right_title, right_description, right_image_url
ALTER TABLE home_section
    ADD COLUMN type              VARCHAR(20) NOT NULL DEFAULT 'PRODUCTS',
    ADD COLUMN description       VARCHAR(300),
    ADD COLUMN image_url         VARCHAR(500),
    ADD COLUMN button_text       VARCHAR(40),
    ADD COLUMN button_link       VARCHAR(300),
    ADD COLUMN right_title       VARCHAR(120),
    ADD COLUMN right_description VARCHAR(300),
    ADD COLUMN right_image_url   VARCHAR(500);

-- The single hero banner (hero_banner, V10) becomes the first HERO block, so the hero is now just a block
-- that can be reordered, duplicated or removed like any other.
UPDATE home_section SET sort_order = sort_order + 1;

INSERT INTO home_section (type, title, description, image_url, button_text, button_link, sort_order, active)
SELECT 'HERO', title, subtitle, image_url, button_text, button_link, 0, TRUE
FROM hero_banner;

DROP TABLE hero_banner;
