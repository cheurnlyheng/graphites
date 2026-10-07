-- Set the first time Shippo's tracking webhook reports a TRANSIT scan for a shipment (see
-- ShippoWebhookService) -- lets the order-tracking page show a real "package is moving" milestone
-- instead of treating "Shipped" and "In Transit" as the same visual state the whole time.
ALTER TABLE shipment ADD COLUMN in_transit_at TIMESTAMPTZ;
