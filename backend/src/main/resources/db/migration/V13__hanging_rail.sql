-- The landing page moves from "browse a big catalog" to a boutique with only a handful of real products,
-- shown hanging on a rail (see HANGING_RAIL in home_section.type). Each product optionally gets its own
-- transparent-background cutout photo of the garment on a hanger, reused in two places: the rail, and as
-- the product detail page's cover image. hanging_hook_percent is how far down the image (as a % of its
-- height) the hanger's hook sits, so the rail animation can pivot/align every garment on the same line
-- regardless of how tall its photo is. Both are optional -- a product with neither still works everywhere,
-- just without the hanging-photo treatment (falls back to its normal thumbnail).
ALTER TABLE product
    ADD COLUMN hanging_image_url    VARCHAR(500),
    ADD COLUMN hanging_hook_percent NUMERIC(5, 2);
