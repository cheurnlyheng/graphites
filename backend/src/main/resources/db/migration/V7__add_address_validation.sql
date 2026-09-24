-- Validated against Shippo right when an order comes in, so a bad shipping address surfaces as an
-- admin warning immediately instead of as a confusing "could not create label" failure later.
ALTER TABLE address ADD COLUMN address_valid BOOLEAN;
ALTER TABLE address ADD COLUMN address_validation_note VARCHAR(500);
