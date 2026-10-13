-- Tracks whether a variant's current dip below its low-stock threshold has already been emailed,
-- so the hourly check doesn't re-send the same alert every hour it stays low. Reset back to false
-- once stock is topped back up above the threshold (see ProductService.updateVariantStock).
ALTER TABLE product_variant ADD COLUMN low_stock_alert_sent BOOLEAN NOT NULL DEFAULT FALSE;
