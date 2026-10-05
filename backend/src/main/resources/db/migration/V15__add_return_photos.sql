-- Condition-proof photos a customer uploads with a return request, so admin can actually check the
-- item's state before approving a refund, instead of relying on the text reason alone.
CREATE TABLE return_photo (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id  UUID NOT NULL REFERENCES return_request(id) ON DELETE CASCADE,
    url                 VARCHAR(500) NOT NULL,
    sort_order          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_return_photo_return_request_id ON return_photo(return_request_id);
