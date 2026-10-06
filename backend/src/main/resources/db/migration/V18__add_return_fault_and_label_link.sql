-- Who's financially responsible for return shipping, decided by the admin at approval time (see
-- ReturnService.approve) -- drives whether the return label's cost gets deducted from the refund.
ALTER TABLE return_request ADD COLUMN shop_fault BOOLEAN;

-- Ties a specific label purchase to the return request it was bought for. An order can have more
-- than one return request over its life (different items, different times), so "the return label
-- for this order" isn't precise enough once there's more than one -- this is what lets refund()
-- find the right label's cost to deduct for a customer-fault return.
ALTER TABLE shipment ADD COLUMN return_request_id UUID;
