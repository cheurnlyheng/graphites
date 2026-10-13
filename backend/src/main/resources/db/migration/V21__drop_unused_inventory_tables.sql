-- Suppliers/restock-orders was scaffolded in from day one but never actually used -- Jess handles
-- restocking outside the app. Dropped in FK-safe order (children before parents): purchase_order_item
-- references purchase_order and product_variant, purchase_order and product_supplier both reference
-- supplier, product_supplier also references product_variant.
DROP TABLE IF EXISTS purchase_order_item;
DROP TABLE IF EXISTS purchase_order;
DROP TABLE IF EXISTS product_supplier;
DROP TABLE IF EXISTS supplier;
