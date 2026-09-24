-- Bug found while testing: deleting a product cascades to delete its variants, but cart_item,
-- order_item, and purchase_order_item all referenced product_variant with the default "NO ACTION"
-- delete behavior -- meaning a product could never be deleted once it had ever been added to any
-- cart, ordered, or put on a purchase order. Fixes:
--   - cart_item: a deleted product should simply vanish from any cart it's sitting in.
--   - order_item / purchase_order_item: must NOT cascade-delete (that would destroy order/PO
--     history). Instead the variant reference is nulled out; both already snapshot the data they
--     need to display historically (name/price for orders, sku looked up defensively for POs).

ALTER TABLE cart_item DROP CONSTRAINT cart_item_product_variant_id_fkey;
ALTER TABLE cart_item ADD CONSTRAINT cart_item_product_variant_id_fkey
    FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) ON DELETE CASCADE;

ALTER TABLE order_item ALTER COLUMN product_variant_id DROP NOT NULL;
ALTER TABLE order_item DROP CONSTRAINT order_item_product_variant_id_fkey;
ALTER TABLE order_item ADD CONSTRAINT order_item_product_variant_id_fkey
    FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) ON DELETE SET NULL;

ALTER TABLE purchase_order_item ALTER COLUMN product_variant_id DROP NOT NULL;
ALTER TABLE purchase_order_item DROP CONSTRAINT purchase_order_item_product_variant_id_fkey;
ALTER TABLE purchase_order_item ADD CONSTRAINT purchase_order_item_product_variant_id_fkey
    FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) ON DELETE SET NULL;
