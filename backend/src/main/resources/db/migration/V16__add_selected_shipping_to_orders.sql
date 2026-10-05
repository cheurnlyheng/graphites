-- The delivery method the customer picked at checkout (a real Shippo-quoted rate), captured so the
-- admin fulfillment queue can buy the matching label instead of guessing. Descriptive only -- not
-- the Shippo rate object id itself, since those expire before an admin necessarily gets to it.
ALTER TABLE orders ADD COLUMN selected_carrier VARCHAR(100);
ALTER TABLE orders ADD COLUMN selected_service_level VARCHAR(200);
