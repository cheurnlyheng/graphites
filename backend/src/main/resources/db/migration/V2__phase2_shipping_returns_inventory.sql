-- Phase 2: shipping (Shippo), returns/exchanges, supplier restocking

CREATE TABLE shipment (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id               UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    carrier                VARCHAR(50),
    tracking_number        VARCHAR(100),
    shippo_transaction_id  VARCHAR(100),
    label_url              VARCHAR(500),
    is_return_label        BOOLEAN NOT NULL DEFAULT FALSE,
    shipped_at             TIMESTAMPTZ,
    estimated_delivery     TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shipment_order_id ON shipment(order_id);

CREATE TABLE return_request (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    customer_id   UUID REFERENCES customer(id) ON DELETE SET NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, APPROVED, REJECTED, RECEIVED, REFUNDED
    reason        VARCHAR(255),
    requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at   TIMESTAMPTZ
);
CREATE INDEX idx_return_request_order_id ON return_request(order_id);

CREATE TABLE return_item (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id  UUID NOT NULL REFERENCES return_request(id) ON DELETE CASCADE,
    order_item_id       UUID NOT NULL REFERENCES order_item(id),
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    reason              VARCHAR(255)
);

CREATE TABLE supplier (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(200) NOT NULL,
    contact_email  VARCHAR(255),
    phone          VARCHAR(30),
    notes          TEXT
);

CREATE TABLE product_supplier (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_variant_id  UUID NOT NULL REFERENCES product_variant(id) ON DELETE CASCADE,
    supplier_id         UUID NOT NULL REFERENCES supplier(id) ON DELETE CASCADE,
    cost_price          NUMERIC(10,2),
    reorder_qty         INTEGER NOT NULL DEFAULT 0,
    UNIQUE (product_variant_id, supplier_id)
);

CREATE TABLE purchase_order (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id  UUID NOT NULL REFERENCES supplier(id),
    status       VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SENT, RECEIVED
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE purchase_order_item (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id   UUID NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
    product_variant_id  UUID NOT NULL REFERENCES product_variant(id),
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    unit_cost           NUMERIC(10,2)
);
