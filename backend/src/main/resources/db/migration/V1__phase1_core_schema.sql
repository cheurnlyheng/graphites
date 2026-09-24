-- Phase 1: catalog, cart, customer, wishlist, orders, admin auth

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

CREATE TABLE admin_user (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(30)  NOT NULL DEFAULT 'ADMIN',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE category (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(150) NOT NULL,
    slug                VARCHAR(150) NOT NULL UNIQUE,
    description         TEXT,
    parent_category_id  UUID REFERENCES category(id) ON DELETE SET NULL
);

CREATE TABLE product (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id   UUID REFERENCES category(id) ON DELETE SET NULL,
    name          VARCHAR(255) NOT NULL,
    slug          VARCHAR(255) NOT NULL UNIQUE,
    description   TEXT,
    status        VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, ACTIVE, ARCHIVED
    weight_grams  INTEGER,
    length_cm     NUMERIC(6,2),
    width_cm      NUMERIC(6,2),
    height_cm     NUMERIC(6,2),
    tax_code      VARCHAR(30), -- Stripe Tax product tax code (e.g. general clothing) for state exemptions
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_category_id ON product(category_id);

CREATE TABLE product_variant (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id           UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    sku                  VARCHAR(64) NOT NULL UNIQUE,
    size                 VARCHAR(20),
    color                VARCHAR(40),
    price                NUMERIC(10,2) NOT NULL,
    stock_qty            INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold  INTEGER NOT NULL DEFAULT 5,
    CONSTRAINT chk_stock_qty_non_negative CHECK (stock_qty >= 0)
);
CREATE INDEX idx_variant_product_id ON product_variant(product_id);

CREATE TABLE product_image (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id   UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    color_group  VARCHAR(40), -- matches product_variant.color; null = shown regardless of color selected
    url          VARCHAR(500) NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_image_product_id ON product_image(product_id);

CREATE TABLE customer (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255), -- null until they set a password (customer record can originate from a guest order)
    first_name     VARCHAR(100),
    last_name      VARCHAR(100),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE address (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id  UUID REFERENCES customer(id) ON DELETE CASCADE, -- null for a guest order's one-off address
    full_name    VARCHAR(200) NOT NULL,
    line1        VARCHAR(255) NOT NULL,
    line2        VARCHAR(255),
    city         VARCHAR(120) NOT NULL,
    state        VARCHAR(120),
    postal_code  VARCHAR(20) NOT NULL,
    country      VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2
    phone        VARCHAR(30)
);
CREATE INDEX idx_address_customer_id ON address(customer_id);

CREATE TABLE cart (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id    UUID REFERENCES customer(id) ON DELETE CASCADE,
    session_token  VARCHAR(128) UNIQUE, -- identifies a guest cart
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_item (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id             UUID NOT NULL REFERENCES cart(id) ON DELETE CASCADE,
    product_variant_id  UUID NOT NULL REFERENCES product_variant(id),
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    UNIQUE (cart_id, product_variant_id)
);

CREATE TABLE wishlist_item (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id  UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    product_id   UUID NOT NULL REFERENCES product(id) ON DELETE CASCADE,
    added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (customer_id, product_id)
);

-- Named "orders", not "order" -- ORDER is a reserved SQL keyword in Postgres.
CREATE TABLE orders (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id                 UUID REFERENCES customer(id) ON DELETE SET NULL,
    email                       VARCHAR(255) NOT NULL,
    status                      VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, PAID, FULFILLED, SHIPPED, CANCELLED, REFUNDED
    subtotal                    NUMERIC(10,2) NOT NULL,
    tax_amount                  NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping_amount             NUMERIC(10,2) NOT NULL DEFAULT 0,
    total                       NUMERIC(10,2) NOT NULL,
    currency                    VARCHAR(3) NOT NULL DEFAULT 'USD',
    stripe_checkout_session_id  VARCHAR(255) UNIQUE,
    stripe_payment_intent_id    VARCHAR(255),
    shipping_address_id         UUID REFERENCES address(id),
    billing_address_id          UUID REFERENCES address(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at                     TIMESTAMPTZ
);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);

CREATE TABLE order_item (
    id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_variant_id            UUID NOT NULL REFERENCES product_variant(id),
    product_name_snapshot         VARCHAR(255) NOT NULL,
    variant_attributes_snapshot   VARCHAR(255), -- e.g. "Size M / Blue"
    unit_price                    NUMERIC(10,2) NOT NULL,
    quantity                      INTEGER NOT NULL CHECK (quantity > 0),
    line_total                    NUMERIC(10,2) NOT NULL
);
CREATE INDEX idx_order_item_order_id ON order_item(order_id);
