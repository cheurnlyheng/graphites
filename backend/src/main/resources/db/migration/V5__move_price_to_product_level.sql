-- Redesign: price moves from product_variant to product. In practice a product's price doesn't
-- change by size or color -- only stock does -- so re-entering (and risking mismatched) prices per
-- variant was pure friction. Variants now only carry size, color, and stock.

ALTER TABLE product ADD COLUMN price NUMERIC(10,2);

-- Backfill from each product's lowest existing variant price (a product with genuinely mixed
-- variant prices -- e.g. a leftover test product -- lands on the lowest one; review it afterward).
UPDATE product p
SET price = sub.min_price
FROM (SELECT product_id, MIN(price) AS min_price FROM product_variant GROUP BY product_id) sub
WHERE p.id = sub.product_id;

UPDATE product SET price = 0 WHERE price IS NULL;
ALTER TABLE product ALTER COLUMN price SET NOT NULL;

ALTER TABLE product_variant DROP COLUMN price;
