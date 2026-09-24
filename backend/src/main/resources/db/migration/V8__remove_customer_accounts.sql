-- Customer accounts (login/register), wishlist and the heart-icon feature are removed: this shop is
-- guest-only checkout, following the pattern of Baggu/Rains -- an account was never required to buy,
-- and order tracking works via the emailed order link instead (see the orders/[id] page + Resend).
DROP TABLE wishlist_item;

-- A cart was never actually reachable by a logged-in customer_id once accounts were removed --
-- every cart is now identified purely by its session token.
DROP INDEX IF EXISTS cart_customer_id_unique;
ALTER TABLE cart DROP COLUMN customer_id;

-- password_hash/first_name/last_name only ever existed to support customer login, which no longer
-- exists. The customer table itself stays: orders/addresses still reference it as a lightweight
-- "who this order belongs to" record, auto-created from the email at checkout.
ALTER TABLE customer DROP COLUMN password_hash;
ALTER TABLE customer DROP COLUMN first_name;
ALTER TABLE customer DROP COLUMN last_name;
