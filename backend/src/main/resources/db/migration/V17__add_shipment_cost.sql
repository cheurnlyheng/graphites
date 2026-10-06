-- What was actually paid Shippo for the label, so reports can deduct real fulfillment cost from
-- revenue instead of just showing what the customer paid. Comes from the rate the admin picked at
-- buy-label time (see ShipmentService.buyLabel) -- Shippo's transaction response has no cost field
-- of its own, only the rate's own object_id.
ALTER TABLE shipment ADD COLUMN cost NUMERIC(10, 2);
