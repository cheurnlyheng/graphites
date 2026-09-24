-- So a paid order's cart can be emptied once payment is confirmed. Without this, a guest whose
-- browser still holds the same cart token would see their already-paid-for items sitting in the
-- cart forever (and risk re-buying them).
ALTER TABLE orders ADD COLUMN cart_id UUID;
