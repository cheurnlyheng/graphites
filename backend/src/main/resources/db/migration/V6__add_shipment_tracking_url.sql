-- The Shippo transaction response's tracking_url_provider was previously discarded; we need it to
-- put a real "track your package" link in the shipping-confirmation email.
ALTER TABLE shipment ADD COLUMN tracking_url VARCHAR(500);
